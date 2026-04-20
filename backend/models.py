from typing import List, Optional
from pydantic import BaseModel, Field

class MacroDate(BaseModel):
    event: str
    last_date: str
    last_period: Optional[str] = None
    next_date: str
    consensus: Optional[str] = None
    actual: Optional[str] = None
    signal: Optional[str] = None # e.g., "BEAT", "MISS"
    note: Optional[str] = None

class CentralBankRate(BaseModel):
    bank: str
    rate: str
    last_decision_date: Optional[str] = None
    last_decision: Optional[str] = None
    next_date: Optional[str] = None
    guidance: str

class G7RateSummary(BaseModel):
    country: str
    rate: str
    bank: str

class MacroCalendar(BaseModel):
    dates: List[MacroDate]
    rates: List[CentralBankRate]
    g7_rates_summary: Optional[List[G7RateSummary]] = None

class RiskSentiment(BaseModel):
    score: float = Field(ge=0, le=10)
    label: Optional[str] = None
    summary: str
    gold_technical: Optional[str] = None
    usd_technical: Optional[str] = None
    safe_haven_analysis: Optional[str] = None
    contagion_analysis: Optional[str] = None
    oil_contagion: Optional[str] = None
    macro_context: Optional[str] = None

class CryptoAsset(BaseModel):
    name: str
    price: str
    change_24h: Optional[str] = None
    change_7d: Optional[str] = None
    contagion_signal: Optional[str] = None
    note: Optional[str] = None

class CryptoContagion(BaseModel):
    summary: str
    assets: List[CryptoAsset]
    btc_equity_correlation: Optional[str] = None
    btc_gold_correlation: Optional[str] = None
    market_cap: Optional[str] = None

class SectoralICR(BaseModel):
    sector: str
    average_icr: float
    status: Optional[str] = None # e.g., "DISTRESSED", "NORMAL"
    note: Optional[str] = None

class MidCapDebtWatch(BaseModel):
    firm_name: str
    ticker: Optional[str] = None
    sector: Optional[str] = None
    debt_load: str
    icr: float
    insider_selling: str
    cds_pricing: str
    pik_usage: Optional[bool] = None
    note: Optional[str] = None

class CreditHealth(BaseModel):
    mid_cap_avg_icr: float
    icr_alert: Optional[bool] = None
    icr_alert_note: Optional[str] = None
    sectoral_breakdown: List[SectoralICR]
    pik_debt_issuance: str
    pik_debt_note: Optional[str] = None
    cre_delinquency_rate: str
    cre_delinquency_trend: Optional[str] = None
    mid_cap_hy_oas: str
    mid_cap_hy_oas_note: Optional[str] = None
    cp_spreads: str
    cp_spreads_note: Optional[str] = None
    vix_of_credit_cdx: str
    vix_of_credit_note: Optional[str] = None
    alert: bool
    watchlist: List[MidCapDebtWatch]

class MarketEvent(BaseModel):
    title: str
    category: Optional[str] = None # e.g., "GEOPOLITICAL"
    severity: Optional[str] = None # e.g., "CRITICAL"
    description: str
    potential_impact: str

class PortfolioAllocation(BaseModel):
    asset_class: str
    percentage: str
    rationale: str

class MacroDashboardResponse(BaseModel):
    generated_at: Optional[str] = None
    calendar: MacroCalendar
    risk: RiskSentiment
    crypto_contagion: Optional[CryptoContagion] = None
    credit: CreditHealth
    events: List[MarketEvent]
    portfolio_suggestions: List[PortfolioAllocation]
    risk_mitigation_steps: List[str]
