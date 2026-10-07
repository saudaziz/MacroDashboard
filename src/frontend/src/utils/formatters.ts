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
