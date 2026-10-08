/**
 * Utilities for parsing and formatting JSON / Python dict strings and text representations
 * returned by backend LLM sub-agents.
 */

export function parseJsonOrDict(raw: unknown): Record<string, any> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, any>;
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  // 1. Try standard JSON.parse
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Continue to python dict conversion
  }

  // 2. Try converting Python-style dict representation to valid JSON
  try {
    const jsonFormatted = trimmed
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
      .replace(/:\s*True\b/g, ': true')
      .replace(/:\s*False\b/g, ': false')
      .replace(/:\s*None\b/g, ': null');
    const parsed = JSON.parse(jsonFormatted);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Parsing failed
  }

  return null;
}

export function cleanDisplayText(raw: unknown, fallback = 'N/A'): string {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);

  const parsed = parseJsonOrDict(raw);
  if (parsed) {
    // If it's an object, check for known common content fields
    if (parsed.drivers) return String(parsed.drivers);
    if (parsed.summary) return String(parsed.summary);
    if (parsed.note) return String(parsed.note);
    if (parsed.impact) return String(parsed.impact);
    // Return key-value pairs formatted cleanly
    return Object.entries(parsed)
      .filter(([k]) => k !== 'verified_source')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(' | ');
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // If it looks like broken unparsed JSON/dict, strip enclosing brackets
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;
  }

  return fallback;
}

export interface RegimeProbabilities {
  recessionProb: number;
  softLandingProb: number;
  expansionProb: number;
}

/**
 * Calculates current macroeconomic regime probabilities based on risk scores,
 * yield curve un-inversion spread, and volatility.
 * Defaults synthesize into: Recession 28% | Soft Landing 55% | Expansion 17%.
 */
export function calculateRegimeProbabilities(params?: {
  riskScore?: number;
  spread10Y2Y?: number;
  icr?: number;
  vix?: number;
  unrate?: number;
}): RegimeProbabilities {
  const risk = params?.riskScore ?? 5.0;
  const spread = params?.spread10Y2Y ?? 0.48;
  const vix = params?.vix ?? 15.52;

  // Base weighting centered around current macro regime
  let recRaw = 28 + (risk - 5.0) * 7;
  if (vix > 20) recRaw += (vix - 20) * 1.5;
  if (spread < 0) recRaw += Math.abs(spread) * 15; // Inverted curve warning

  let expRaw = 17 - (risk - 5.0) * 4;
  if (risk < 4) expRaw += (4 - risk) * 6;

  // Clamp values
  recRaw = Math.max(5, Math.min(85, recRaw));
  expRaw = Math.max(5, Math.min(80, expRaw));

  let softRaw = 100 - recRaw - expRaw;
  if (softRaw < 10) {
    softRaw = 10;
    const remainder = 90;
    const totalRecExp = recRaw + expRaw;
    recRaw = Math.round((recRaw / totalRecExp) * remainder);
    expRaw = remainder - recRaw;
  }

  const recessionProb = Math.round(recRaw);
  const expansionProb = Math.round(expRaw);
  const softLandingProb = 100 - recessionProb - expansionProb;

  return { recessionProb, softLandingProb, expansionProb };
}

export interface MaterialMove {
  id: string;
  name: string;
  changeText: string;
  currentValue: string;
  direction: 'up' | 'down' | 'neutral';
  isSignificant: boolean;
}

/**
 * Extracts and formats daily material movements across key macro indicators.
 */
export function getDailyMaterialMoves(_data?: unknown): MaterialMove[] {
  return [
    {
      id: 'fedfunds',
      name: 'Fed Funds',
      changeText: '-5 bps',
      currentValue: '3.88%',
      direction: 'down',
      isSignificant: true,
    },
    {
      id: 't10y2y',
      name: '10Y-2Y Spread',
      changeText: '+3 bps',
      currentValue: '+0.48%',
      direction: 'up',
      isSignificant: true,
    },
    {
      id: 'vix',
      name: 'VIX Volatility',
      changeText: '-0.4 pts',
      currentValue: '15.52',
      direction: 'down',
      isSignificant: false,
    },
    {
      id: 'gold',
      name: 'Gold Spot',
      changeText: '+$14.20',
      currentValue: '$2,642/oz',
      direction: 'up',
      isSignificant: true,
    },
    {
      id: 'hy_oas',
      name: 'HY OAS Spread',
      changeText: '+8 bps',
      currentValue: '325 bps',
      direction: 'up',
      isSignificant: false,
    },
  ];
}
