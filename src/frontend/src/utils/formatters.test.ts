import { describe, expect, it } from 'vitest';
import { cleanDisplayText, parseJsonOrDict } from './formatters';

describe('formatters', () => {
  it('parses valid JSON string', () => {
    const raw = '{"dxy_level": 104.85, "drivers": "Strong USD", "verified_source": "ICE"}';
    const result = parseJsonOrDict(raw);
    expect(result).not.toBeNull();
    expect(result?.dxy_level).toBe(104.85);
    expect(result?.drivers).toBe('Strong USD');
    expect(result?.verified_source).toBe('ICE');
  });

  it('parses Python dict string with single quotes', () => {
    const raw = "{'credit_spreads': 'High-yield spreads widening', 'sector_risk': 'Financials under pressure', 'verified_source': 'Bloomberg'}";
    const result = parseJsonOrDict(raw);
    expect(result).not.toBeNull();
    expect(result?.credit_spreads).toBe('High-yield spreads widening');
    expect(result?.sector_risk).toBe('Financials under pressure');
    expect(result?.verified_source).toBe('Bloomberg');
  });

  it('returns plain string cleanly with cleanDisplayText', () => {
    expect(cleanDisplayText('Gold spot is $2,480.00')).toBe('Gold spot is $2,480.00');
    expect(cleanDisplayText(null)).toBe('N/A');
    expect(cleanDisplayText(undefined, 'Fallback')).toBe('Fallback');
  });

  it('extracts driver cleanly from JSON string in cleanDisplayText', () => {
    const raw = '{"dxy_level": 104.85, "drivers": "The DXY is bolstered by yield differentials."}';
    expect(cleanDisplayText(raw)).toBe('The DXY is bolstered by yield differentials.');
  });
});
