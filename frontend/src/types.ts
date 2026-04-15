export interface MacroDate {
  event: string;
  last_date: string;
  next_date: string;
  consensus?: string;
  actual?: string;
}

export interface CentralBankRate {
  bank: string;
  rate: string;
  guidance: string;
}

export interface MacroCalendar {
  dates: MacroDate[];
  rates: CentralBankRate[];
}

export interface RiskSentiment {
  score: number;
  summary: string;
  gold_technical?: string;
  usd_technical?: string;
  safe_haven_analysis?: string;
  contagion_analysis: string;
}

export interface SectoralICR {
  sector: string;
  average_icr: number;
}

export interface MidCapDebtWatch {
  firm_name: string;
  debt_load: string;
  icr: number;
  insider_selling: string;
  cds_pricing: string;
}

export interface CreditHealth {
  mid_cap_avg_icr: number;
  sectoral_breakdown: SectoralICR[];
  pik_debt_issuance: string;
  cre_delinquency_rate: string;
  mid_cap_hy_oas: string;
  cp_spreads: string;
  vix_of_credit_cdx: string;
  watchlist: MidCapDebtWatch[];
  alert: boolean;
}

export interface MarketEvent {
  title: string;
  description: string;
  potential_impact: string;
}

export interface PortfolioAllocation {
  asset_class: string;
  percentage: string;
  rationale: string;
}

export interface MacroDashboardResponse {
  calendar: MacroCalendar;
  risk: RiskSentiment;
  credit: CreditHealth;
  events: MarketEvent[];
  portfolio_suggestions: PortfolioAllocation[];
  risk_mitigation_steps: string[];
}
