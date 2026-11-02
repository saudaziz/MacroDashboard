import { describe, expect, it } from 'vitest';
import { formatSignedPct, isSahmTriggered, SAHM_TRIGGER } from './recessionMath';

describe('recessionMath', () => {
  it('fires the Sahm Rule at 0.5 points and not below', () => {
    expect(SAHM_TRIGGER).toBe(0.5);
    expect(isSahmTriggered(0.5)).toBe(true);
    expect(isSahmTriggered(0.49)).toBe(false);
    expect(isSahmTriggered(-0.07)).toBe(false);
  });

  it('formats signed percentages', () => {
    expect(formatSignedPct(0.48)).toBe('+0.48%');
    expect(formatSignedPct(-0.3)).toBe('−0.30%');
  });
});
