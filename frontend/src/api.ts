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
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (!candidate.calendar || !candidate.risk || !candidate.credit) {
    return null;
  }
  return value as MacroDashboardResponse;
}
