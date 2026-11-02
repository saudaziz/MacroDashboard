import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';

export interface PlaybookReading {
  value: number | null;
  date: string | null;
  series: string;
}

export interface PlaybookSnapshot {
  source: 'fred' | 'partial' | 'unavailable';
  reason: string | null;
  generated_at: string;
  readings: Record<string, PlaybookReading>;
  sahm_gap: { value: number | null; date: string | null };
  icsa_spike_pct: { value: number | null; date: string | null };
}

/** Live FRED readings for the Recession Playbook. Unavailable values come back as null, never as mock numbers. */
export async function fetchRecessionPlaybook(): Promise<PlaybookSnapshot> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/recession-playbook`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Playbook request failed with ${response.status}`);
    }
    return (await response.json()) as PlaybookSnapshot;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
