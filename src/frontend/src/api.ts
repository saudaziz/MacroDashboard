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
  run_id: string;
  session_id: string;
}

function withAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const authHeaders: Record<string, string> = {};
  const runtimeApiKey =
    typeof window !== 'undefined' ? window.sessionStorage.getItem('macro_api_key') ?? '' : '';
  if (runtimeApiKey.trim().length > 0) {
    authHeaders['X-API-Key'] = runtimeApiKey;
  }
  return { ...headers, ...authHeaders };
}

async function fetchJson<T>(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: withAuthHeaders(init.headers),
      signal: controller.signal,
    });
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

export async function cancelDashboard(runId: string, sessionId: string): Promise<void> {
  await fetchJson('/api/cancel-dashboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId, session_id: sessionId }),
  });
}

export async function resumeWorkflow(runId: string, sessionId: string, decision: 'approved' | 'rejected'): Promise<void> {
  await fetchJson('/api/resume-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId, session_id: sessionId, decision }),
  });
}

export async function* streamDashboard(
  payload: StreamRequest,
  signal: AbortSignal,
): AsyncGenerator<StreamStatusPayload, void, undefined> {
  const response = await fetch(`${API_BASE_URL}/api/stream-dashboard`, {
    method: 'POST',
    headers: withAuthHeaders({ 'Content-Type': 'application/json' }),
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

export function createBackendRequestPreview(provider: string, skipCache: boolean, runId: string, sessionId: string): string {
  const requestPayload = JSON.stringify({ provider, skip_cache: skipCache, run_id: runId, session_id: sessionId }, null, 2);
  return [
    `POST ${API_BASE_URL}/api/stream-dashboard`,
    `Headers: ${JSON.stringify(withAuthHeaders({ 'Content-Type': 'application/json' }), null, 2)}`,
    `Body: ${requestPayload}`,
  ].join('\n\n');
}

export function validateDashboardData(value: unknown): MacroDashboardResponse | null {
  console.log('[Validator] Validating dashboard data payload:', value);
  
  if (!value || typeof value !== 'object') {
    console.error('[Validator] Payload is not an object or is null:', value);
    return null;
  }
  const candidate = value as Record<string, unknown>;

  const calendar = candidate.calendar as Record<string, unknown> | undefined;
  const risk = candidate.risk as Record<string, unknown> | undefined;
  const credit = candidate.credit as Record<string, unknown> | undefined;

  if (!calendar || typeof calendar !== 'object' || !Array.isArray(calendar.dates) || !Array.isArray(calendar.rates)) {
    console.error('[Validator] Invalid calendar section:', calendar);
    return null;
  }
  if (!risk || typeof risk !== 'object' || typeof risk.score !== 'number' || typeof risk.summary !== 'string') {
    console.error('[Validator] Invalid risk section:', risk);
    return null;
  }
  if (!credit || typeof credit !== 'object') {
    console.error('[Validator] Invalid credit section:', credit);
    return null;
  }

  const requiredCreditFields = [
    'mid_cap_avg_icr',
    'sectoral_breakdown',
    'pik_debt_issuance',
    'cre_delinquency_rate',
    'mid_cap_hy_oas',
    'cp_spreads',
    'vix_of_credit_cdx',
    'watchlist',
    'alert',
  ] as const;
  for (const field of requiredCreditFields) {
    if (!(field in credit)) {
      console.error(`[Validator] Missing required credit field: ${field}`);
      return null;
    }
  }

  if (!Array.isArray(candidate.events) || !Array.isArray(candidate.portfolio_suggestions) || !Array.isArray(candidate.risk_mitigation_steps)) {
    console.error('[Validator] Invalid array sections in payload.');
    return null;
  }

  console.log('[Validator] Validation successful.');
  return candidate as MacroDashboardResponse;
}
