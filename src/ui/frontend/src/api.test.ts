import { describe, expect, it } from 'vitest';
import { validateDashboardData } from './api';

describe('validateDashboardData', () => {
  it('accepts minimal dashboard-like payload', () => {
    const value = {
      calendar: { dates: [], rates: [] },
      risk: { score: 5, summary: 'stable' },
      credit: {
        mid_cap_avg_icr: 1.2,
        sectoral_breakdown: [],
        pik_debt_issuance: 'low',
        cre_delinquency_rate: '1%',
        mid_cap_hy_oas: '100',
        cp_spreads: '10',
        vix_of_credit_cdx: '50',
        watchlist: [],
        alert: false,
      },
      events: [],
      portfolio_suggestions: [],
      risk_mitigation_steps: [],
    };

    expect(validateDashboardData(value)).not.toBeNull();
  });

  it('rejects malformed payloads', () => {
    expect(validateDashboardData(null)).toBeNull();
    expect(validateDashboardData({ risk: {}, credit: {} })).toBeNull();
  });
});
