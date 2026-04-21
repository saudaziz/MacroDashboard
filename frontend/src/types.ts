export interface MacroDate {
  event: string;
  last_date: string;
  last_period?: string;
  next_date: string;
  consensus?: string;
  actual?: string;
  signal?: string;
  note?: string;
}

export interface CentralBankRate {
  bank: string;
  rate: string;
  last_decision_date?: string;
  last_decision?: string;
  next_date?: string;
  guidance: string;
}

export interface G7RateSummary {
  country: string;
  rate: string;
  bank: string;
}

export interface MacroCalendar {
  dates: MacroDate[];
  rates: CentralBankRate[];
  g7_rates_summary?: G7RateSummary[];
}

export interface RiskSentiment {
  score: number;
  label?: string;
  summary: string;
  gold_technical?: string;
  usd_technical?: string;
  safe_haven_analysis?: string;
  contagion_analysis?: string;
  oil_contagion?: string;
  macro_context?: string;
}

export interface CryptoAsset {
  name: string;
  price: string;
  change_24h?: string;
  change_7d?: string;
  contagion_signal?: string;
  note?: string;
}

export interface CryptoContagion {
  summary: string;
  assets: CryptoAsset[];
  btc_equity_correlation?: string;
  btc_gold_correlation?: string;
  market_cap?: string;
}

export interface SectoralICR {
  sector: string;
  average_icr: number;
  status?: string;
  note?: string;
}

export interface MidCapDebtWatch {
  firm_name: string;
  ticker?: string;
  sector?: string;
  debt_load: string;
  icr: number;
  insider_selling: string;
  cds_pricing: string;
  pik_usage?: boolean;
  note?: string;
}

export interface CreditHealth {
  mid_cap_avg_icr: number;
  icr_alert?: boolean;
  icr_alert_note?: string;
  sectoral_breakdown: SectoralICR[];
  pik_debt_issuance: string;
  pik_debt_note?: string;
  cre_delinquency_rate: string;
  cre_delinquency_trend?: string;
  mid_cap_hy_oas: string;
  mid_cap_hy_oas_note?: string;
  cp_spreads: string;
  cp_spreads_note?: string;
  vix_of_credit_cdx: string;
  vix_of_credit_note?: string;
  watchlist: MidCapDebtWatch[];
  alert: boolean;
}

export interface MarketEvent {
  title: string;
  category?: string;
  severity?: string;
  description: string;
  potential_impact: string;
}

export interface PortfolioAllocation {
  asset_class: string;
  percentage: string;
  rationale: string;
}

export interface MacroIndicator {
  name: string;
  value: string;
  unit?: string;
  trend?: string;
  note?: string;
}

export interface MacroIndicators {
  yield_curve_3m_10y?: MacroIndicator;
  yield_curve_2y_10y?: MacroIndicator;
  inflation_cpi?: MacroIndicator;
  inflation_pce?: MacroIndicator;
  unemployment_rate?: MacroIndicator;
  m2_money_supply?: MacroIndicator;
  fed_funds_rate?: MacroIndicator;
}

export interface MacroDashboardResponse {
  generated_at?: string;
  calendar: MacroCalendar;
  risk: RiskSentiment;
  crypto_contagion?: CryptoContagion;
  credit: CreditHealth;
  macro_indicators?: MacroIndicators;
  events: MarketEvent[];
  portfolio_suggestions: PortfolioAllocation[];
  risk_mitigation_steps: string[];
  reasoning?: string | null;
}


export interface TokenStats {
  request_tokens?: number;
  response_tokens?: number;
  total_tokens?: number;
}

export interface LatestDashboardPayload {
  provider?: string;
  dashboard_data?: MacroDashboardResponse;
  raw_response?: string;
  llm_request?: string;
  token_stats?: TokenStats;
}

export interface AgentStep {
  agent: string;
  message: string;
}

export interface AgentMessage {
  agent: string;
  message: string;
}

export interface Interrupt {
  agent: string;
  message: string;
  data?: any;
}

export interface StreamStatusPayload {
  status: string;
  message?: string;
  data?: MacroDashboardResponse;
  raw_response?: string;
  llm_request?: string;
  reasoning?: string | null;
  token_stats?: TokenStats;
  agent?: string;
  section?: string;
  interrupt?: Interrupt;
}
