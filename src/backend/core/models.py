from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class MacroBaseModel(BaseModel):
    # Coerce numeric values into strings where the schema expects strings.
    model_config = ConfigDict(coerce_numbers_to_str=True, extra="ignore")
    verified_source: Optional[str] = None

class MacroDate(MacroBaseModel):
    event: str
    last_date: str
    last_period: Optional[str] = None
    next_date: str
    consensus: Optional[str] = None
    actual: Optional[str] = None
    signal: Optional[str] = None # e.g., "BEAT", "MISS"
    note: Optional[str] = None

class CentralBankRate(MacroBaseModel):
    bank: str
    rate: str
    last_decision_date: Optional[str] = None
    last_decision: Optional[str] = None
    next_date: Optional[str] = None
    guidance: str

class G7RateSummary(MacroBaseModel):
    country: str
    rate: str
    bank: str

class MacroCalendar(MacroBaseModel):
    dates: List[MacroDate]
    rates: List[CentralBankRate]
    g7_rates_summary: Optional[List[G7RateSummary]] = None

class RiskSentiment(MacroBaseModel):
    score: float = Field(ge=0, le=10)
    label: Optional[str] = None
    summary: str
    gold_technical: Optional[str] = None
    usd_technical: Optional[str] = None
    safe_haven_analysis: Optional[str] = None
    contagion_analysis: Optional[str] = None
    oil_contagion: Optional[str] = None
    macro_context: Optional[str] = None

    @field_validator("score", mode="before")
    @classmethod
    def _coerce_score(cls, value):
        # Handle string 'NaN' and other invalid values
        if isinstance(value, str):
            if value.lower() in ('nan', 'n/a', 'unknown', ''):
                return 5.0
            try:
                result = float(value)
                if result != result:  # NaN check
                    return 5.0
                return max(0.0, min(10.0, result))
            except (ValueError, TypeError):
                return 5.0
        if isinstance(value, (int, float)):
            result = float(value)
            if result != result:  # NaN
                return 5.0
            return max(0.0, min(10.0, result))
        return 5.0

    @field_validator("gold_technical", "usd_technical", "oil_contagion", "safe_haven_analysis", "contagion_analysis", mode="before")
    @classmethod
    def _coerce_technical_to_string(cls, value):
        if value is None:
            return "No data"
        if isinstance(value, (dict, list)):
            import json
            return json.dumps(value)
        return str(value)

class CryptoAsset(MacroBaseModel):
    name: str
    price: str
    change_24h: Optional[str] = None
    change_7d: Optional[str] = None
    contagion_signal: Optional[str] = None
    note: Optional[str] = None

    @field_validator("price", mode="before")
    @classmethod
    def _coerce_price(cls, value):
        if value is None:
            raise ValueError("price is required")
        return str(value)

    @field_validator("change_24h", "change_7d", "contagion_signal", "note", mode="before")
    @classmethod
    def _coerce_optional_strings(cls, value):
        if value is None:
            return None
        return str(value)

class CryptoContagion(MacroBaseModel):
    summary: Optional[str] = None
    assets: List[CryptoAsset]
    btc_equity_correlation: Optional[str] = None
    btc_gold_correlation: Optional[str] = None
    market_cap: Optional[str] = None

    @field_validator("summary", mode="before")
    @classmethod
    def _coerce_summary(cls, value):
        if value is None:
            return "Crypto market analysis data"
        if isinstance(value, (dict, list)):
            import json
            return json.dumps(value)
        return str(value)

    @field_validator("btc_equity_correlation", "btc_gold_correlation", "market_cap", mode="before")
    @classmethod
    def _coerce_optional_meta_strings(cls, value):
        if value is None:
            return None
        return str(value)

class SectoralICR(MacroBaseModel):
    sector: str
    average_icr: float
    status: Optional[str] = None # e.g., "DISTRESSED", "NORMAL"
    note: Optional[str] = None

    @field_validator("average_icr", mode="before")
    @classmethod
    def _coerce_average_icr(cls, value):
        if value is None:
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

class MidCapDebtWatch(MacroBaseModel):
    firm_name: str
    ticker: Optional[str] = None
    sector: Optional[str] = None
    debt_load: str
    icr: float
    insider_selling: str
    cds_pricing: str
    pik_usage: Optional[bool] = None
    note: Optional[str] = None

    @field_validator("insider_selling", mode="before")
    @classmethod
    def _coerce_insider_selling(cls, value):
        if value is None:
            return "No data"
        return str(value)

class CreditHealth(MacroBaseModel):
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

class MarketEvent(MacroBaseModel):
    title: str
    category: Optional[str] = None # e.g., "GEOPOLITICAL"
    severity: Optional[str] = None # e.g., "CRITICAL"
    description: str
    potential_impact: str

class PortfolioAllocation(MacroBaseModel):
    asset_class: str
    percentage: str
    rationale: str

class MacroIndicator(MacroBaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    trend: Optional[str] = None # UP/DOWN/STABLE
    note: Optional[str] = None

class MacroIndicators(MacroBaseModel):
    yield_curve_3m_10y: Optional[MacroIndicator] = None
    yield_curve_2y_10y: Optional[MacroIndicator] = None
    inflation_cpi: Optional[MacroIndicator] = None
    inflation_pce: Optional[MacroIndicator] = None
    unemployment_rate: Optional[MacroIndicator] = None
    m2_money_supply: Optional[MacroIndicator] = None
    fed_funds_rate: Optional[MacroIndicator] = None

class CorrelationPoint(MacroBaseModel):
    date: str
    yield_2y: float
    yield_5y: float
    yield_10y: float
    spread_10y_2y: float
    vix: float

class ExecutiveSummary(MacroBaseModel):
    status_label: str = "Caution: Late-Cycle Transition"
    market_weather: str = "Storm Clouds Gathering"
    traffic_light: str = "YELLOW" # GREEN, YELLOW, RED
    plain_english_headline: str = (
        "Stock indexes are near all-time highs, but carried by only a few mega-tech giants "
        "while borrowing stress and bond signals point to a coming slowdown."
    )
    plain_english_explanation: str = (
        "On the surface, markets seem calm with volatility (VIX) suppressed. "
        "However, market breadth has severely narrowed ('The Unbroadening') with the average stock lagging. "
        "At the same time, the Treasury yield curve has un-inverted and steepened—a classic historical precursor to market pullbacks. "
        "Rising credit card and loan delinquencies show consumer balance sheets are under pressure."
    )
    actionable_advice: List[str] = Field(
        default_factory=lambda: [
            "1. Build & Guard Cash: Maintain a 6-12 month emergency buffer in high-yield cash or Treasuries earning ~4-5%.",
            "2. Trim Overextended Winners: Lock in gains from concentrated tech positions and rebalance into diversified assets.",
            "3. Lock In Bond Yields: Secure attractive yields in 5-10Y Treasuries before future rate cuts.",
            "4. Avoid FOMO Chasing: Do not buy speculative stocks at all-time highs without strict risk rules.",
        ]
    )
    tripwires: List[str] = Field(
        default_factory=lambda: [
            "1. Unemployment Rate (Sahm Rule): Rises above 4.3% (Current: 4.2%). Historical recession lag: 0–2 months.",
            "2. Mega-Cap Earnings Stumble: Hyperscaler AI capex returns disappoint or cloud growth slows. Market selloff lag: 1–3 months.",
            "3. Corporate Credit Distress: High-yield spreads widen above 500 bps or mid-cap ICR drops below 1.8x (Current: 2.15x). Recession lag: 2–4 months.",
            "4. Volatility Awakening: CBOE VIX surges above 20–25 from current 15.5. Pullback lag: Immediate (days to weeks).",
        ]
    )

class MacroCorrelations(MacroBaseModel):
    historical_points: List[CorrelationPoint] = Field(default_factory=list)
    current_regime: str = "Un-Inverting (Late Cycle Transition)"
    yield_curve_signal: str = "10Y-2Y Spread (+0.48%) has un-inverted from deep -1.08% trough; historical danger window"
    vix_regime: str = "Calm Surface (15.5) masking underlying bond & breadth strains"
    breadth_signal: str = "The Unbroadening: Narrow rally led by mega-cap tech; vulnerable to leadership rotation"
    credit_headwinds: str = "Consumer FICO deterioration & commercial credit stress building"

class MacroDashboardResponse(MacroBaseModel):
    generated_at: Optional[str] = None
    calendar: MacroCalendar
    risk: RiskSentiment
    crypto_contagion: Optional[CryptoContagion] = None
    credit: CreditHealth
    macro_indicators: Optional[MacroIndicators] = None
    events: List[MarketEvent]
    portfolio_suggestions: List[PortfolioAllocation]
    risk_mitigation_steps: List[str]
    correlations: Optional[MacroCorrelations] = None
    executive_summary: Optional[ExecutiveSummary] = None
    reasoning: Optional[str] = None
    validation_warnings: List[str] = Field(default_factory=list)
    data_quality: str = "live"
    fallback_mode: Optional[str] = None
    fallback_sections: List[str] = Field(default_factory=list)
