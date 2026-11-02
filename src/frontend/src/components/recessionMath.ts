// Small pure helpers for the Recession Playbook. The Sahm gap and ICSA spike are computed by the backend
// (src/backend/core/playbook_data.py) from the FRED history, so they are not recomputed here.

/** Sahm Rule trigger: 3-month average unemployment must sit this many points above its 12-month low. */
export const SAHM_TRIGGER = 0.5;

export const isSahmTriggered = (gap: number): boolean => gap >= SAHM_TRIGGER;

/** Signed percentage string, e.g. 0.48 -> "+0.48%". */
export const formatSignedPct = (value: number): string =>
  `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}%`;
