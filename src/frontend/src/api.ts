import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import type {
  LatestDashboardPayload,
  MacroDashboardResponse,
  StreamStatusPayload,
} from './types';
import { parseSseChunk } from './utils/sse';

interface StreamRequest {
  provider: string;
  skip_cache: boolean;
}

async function fetchJson<T>(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: controller.signal });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(text || `Request failed with ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function getProviders(): Promise<string[]> {
  return fetchJson<string[]>('/api/providers');
}

export async function getLatestDashboard(): Promise<LatestDashboardPayload> {
  return fetchJson<LatestDashboardPayload>('/api/latest-dashboard');
}

export async function cancelDashboard(): Promise<void> {
  await fetchJson('/api/cancel-dashboard', { method: 'POST' });
}

export async function resumeWorkflow(decision: 'approved' | 'rejected'): Promise<void> {
  await fetchJson('/api/resume-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision }),
  });
}

export async function* streamDashboard(
  payload: StreamRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamStatusPayload, void, undefined> {
  const response = await fetch(`${API_BASE_URL}/api/stream-dashboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Failed to connect to agent stream.');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Stream reader not available.');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim().length > 0) {
        const parsed = parseSseChunk('\n\n', buffer);
        for (const event of parsed.events) {
          yield event;
        }
      }
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(chunk, buffer);
    buffer = parsed.buffer;
    for (const event of parsed.events) {
      yield event;
    }
  }
}

export function createBackendRequestPreview(provider: string, skipCache: boolean): string {
  const requestPayload = JSON.stringify({ provider, skip_cache: skipCache }, null, 2);
  return [
    `POST ${API_BASE_URL}/api/stream-dashboard`,
    `Headers: ${JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)}`,
    `Body: ${requestPayload}`,
  ].join('\n\n');
}

export function validateDashboardData(value: unknown): MacroDashboardResponse | null {
  console.log('[Validator] Validating dashboard data payload:', value);
  
  if (!value || typeof value !== 'object') {
    console.error('[Validator] Payload is not an object or is null:', value);
    return null;
  }
  const candidate = value as Record<string, any>;
  
  // Ensure required sections exist at least as empty objects/arrays
  const sections = ['calendar', 'risk', 'credit', 'events', 'portfolio_suggestions', 'risk_mitigation_steps'];
  sections.forEach(section => {
    if (!candidate[section]) {
      console.warn(`[Validator] Missing section "${section}", providing default.`);
      if (section === 'calendar') candidate.calendar = { dates: [], rates: [] };
      else if (section === 'risk') candidate.risk = { score: 5, summary: 'N/A' };
      else if (section === 'credit') candidate.credit = { mid_cap_avg_icr: 0, sectoral_breakdown: [], pik_debt_issuance: 'N/A', cre_delinquency_rate: 'N/A', watchlist: [], alert: false };
      else if (['events', 'portfolio_suggestions', 'risk_mitigation_steps'].includes(section)) {
        candidate[section] = [];
      }
    }
  });
  
  console.log('[Validator] Validation successful. Resulting candidate:', candidate);
  return candidate as MacroDashboardResponse;
}
