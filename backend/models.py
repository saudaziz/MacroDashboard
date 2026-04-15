from typing import List, Optional
from pydantic import BaseModel, Field

class MacroDate(BaseModel):
    event: str
    last_date: str
    next_date: str
    consensus: Optional[str] = None
    actual: Optional[str] = None

class CentralBankRate(BaseModel):
    bank: str
    rate: str
    guidance: str

class MacroCalendar(BaseModel):
    dates: List[MacroDate]
    rates: List[CentralBankRate]

class RiskSentiment(BaseModel):
    score: int = Field(ge=1, le=10)
    summary: str
    gold_technical: Optional[str] = None
    usd_technical: Optional[str] = None
    safe_haven_analysis: Optional[str] = None
    contagion_analysis: str

class SectoralICR(BaseModel):
    sector: str
    average_icr: float

class MidCapDebtWatch(BaseModel):
    firm_name: str
    debt_load: str
    icr: float
    insider_selling: str
    cds_pricing: str

class CreditHealth(BaseModel):
    mid_cap_avg_icr: float
    sectoral_breakdown: List[SectoralICR]
    pik_debt_issuance: str
    cre_delinquency_rate: str
    mid_cap_hy_oas: str
    cp_spreads: str
    vix_of_credit_cdx: str
    watchlist: List[MidCapDebtWatch]
    alert: bool

class MarketEvent(BaseModel):
    title: str
    description: str
    potential_impact: str

class PortfolioAllocation(BaseModel):
    asset_class: str
    percentage: str
    rationale: str

class MacroDashboardResponse(BaseModel):
    calendar: MacroCalendar
    risk: RiskSentiment
    credit: CreditHealth
    events: List[MarketEvent]
    portfolio_suggestions: List[PortfolioAllocation]
    risk_mitigation_steps: List[str]
