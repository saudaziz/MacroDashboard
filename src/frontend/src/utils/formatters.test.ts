import { describe, expect, it } from 'vitest';
import {
  cleanDisplayText,
  parseJsonOrDict,
  calculateRegimeProbabilities,
  getDailyMaterialMoves,
} from './formatters';

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

  it('calculates default baseline regime probabilities totaling 100%', () => {
    const res = calculateRegimeProbabilities();
    expect(res.recessionProb).toBe(28);
    expect(res.softLandingProb).toBe(55);
    expect(res.expansionProb).toBe(17);
    expect(res.recessionProb + res.softLandingProb + res.expansionProb).toBe(100);
  });

  it('adjusts regime probabilities when risk score changes', () => {
    const highRisk = calculateRegimeProbabilities({ riskScore: 8.5 });
    expect(highRisk.recessionProb).toBeGreaterThan(40);
    expect(highRisk.recessionProb + highRisk.softLandingProb + highRisk.expansionProb).toBe(100);

    const lowRisk = calculateRegimeProbabilities({ riskScore: 2.0 });
    expect(lowRisk.recessionProb).toBeLessThan(15);
    expect(lowRisk.expansionProb).toBeGreaterThan(25);
    expect(lowRisk.recessionProb + lowRisk.softLandingProb + lowRisk.expansionProb).toBe(100);
  });

  it('returns daily material moves with expected attributes', () => {
    const moves = getDailyMaterialMoves();
    expect(moves.length).toBeGreaterThanOrEqual(4);
    const fedFunds = moves.find((m) => m.id === 'fedfunds');
    expect(fedFunds).toBeDefined();
    expect(fedFunds?.changeText).toBe('-5 bps');
    expect(fedFunds?.direction).toBe('down');
  });
});
