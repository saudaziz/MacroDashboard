using System.Text.Json;
using System.Text.Json.Serialization;

namespace MacroDashboard.Backend.Models;

public class FlexibleDoubleConverter : JsonConverter<double>
{
    public override double Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number) return reader.GetDouble();
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (double.TryParse(s, out var d)) return d;
        }
        return 0;
    }
    public override void Write(Utf8JsonWriter writer, double value, JsonSerializerOptions options) =>
        writer.WriteNumberValue(value);
}

public class FlexibleBoolConverter : JsonConverter<bool>
{
    public override bool Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.True) return true;
        if (reader.TokenType == JsonTokenType.False) return false;
        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString()?.ToLower();
            return s == "true" || s == "yes" || s == "1";
        }
        return false;
    }
    public override void Write(Utf8JsonWriter writer, bool value, JsonSerializerOptions options) =>
        writer.WriteBooleanValue(value);
}

public record MacroDate(
    [property: JsonPropertyName("event")] string Event,
    [property: JsonPropertyName("last_date")] string LastDate,
    [property: JsonPropertyName("last_period")] string? LastPeriod,
    [property: JsonPropertyName("next_date")] string NextDate,
    [property: JsonPropertyName("consensus")] string? Consensus,
    [property: JsonPropertyName("actual")] string? Actual,
    [property: JsonPropertyName("signal")] string? Signal,
    [property: JsonPropertyName("note")] string? Note
);

public record CentralBankRate(
    [property: JsonPropertyName("bank")] string Bank,
    [property: JsonPropertyName("rate")] string Rate,
    [property: JsonPropertyName("last_decision_date")] string? LastDecisionDate,
    [property: JsonPropertyName("last_decision")] string? LastDecision,
    [property: JsonPropertyName("next_date")] string? NextDate,
    [property: JsonPropertyName("guidance")] string Guidance
);

public record G7RateSummary(
    [property: JsonPropertyName("country")] string Country,
    [property: JsonPropertyName("rate")] string Rate,
    [property: JsonPropertyName("bank")] string Bank
);

public record MacroCalendar(
    [property: JsonPropertyName("dates")] List<MacroDate> Dates,
    [property: JsonPropertyName("rates")] List<CentralBankRate> Rates,
    [property: JsonPropertyName("g7_rates_summary")] List<G7RateSummary>? G7RatesSummary
);

public record RiskSentiment(
    [property: JsonConverter(typeof(FlexibleDoubleConverter))]
    [property: JsonPropertyName("score")] double Score,
    [property: JsonPropertyName("label")] string? Label,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("gold_technical")] string? GoldTechnical,
    [property: JsonPropertyName("usd_technical")] string? UsdTechnical,
    [property: JsonPropertyName("safe_haven_analysis")] string? SafeHavenAnalysis,
    [property: JsonPropertyName("contagion_analysis")] string? ContagionAnalysis,
    [property: JsonPropertyName("oil_contagion")] string? OilContagion,
    [property: JsonPropertyName("macro_context")] string? MacroContext
);

public record CryptoAsset(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("price")] string Price,
    [property: JsonPropertyName("change_24h")] string? Change24h,
    [property: JsonPropertyName("change_7d")] string? Change7d,
    [property: JsonPropertyName("contagion_signal")] string? ContagionSignal,
    [property: JsonPropertyName("note")] string? Note
);

public record CryptoContagion(
    [property: JsonPropertyName("summary")] string? Summary,
    [property: JsonPropertyName("assets")] List<CryptoAsset> Assets,
    [property: JsonPropertyName("btc_equity_correlation")] string? BtcEquityCorrelation,
    [property: JsonPropertyName("btc_gold_correlation")] string? BtcGoldCorrelation,
    [property: JsonPropertyName("market_cap")] string? MarketCap
);

public record SectoralICR(
    [property: JsonPropertyName("sector")] string Sector,
    [property: JsonConverter(typeof(FlexibleDoubleConverter))]
    [property: JsonPropertyName("average_icr")] double AverageIcr,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("note")] string? Note
);

public record MidCapDebtWatch(
    [property: JsonPropertyName("firm_name")] string FirmName,
    [property: JsonPropertyName("ticker")] string? Ticker,
    [property: JsonPropertyName("sector")] string? Sector,
    [property: JsonPropertyName("debt_load")] string DebtLoad,
    [property: JsonConverter(typeof(FlexibleDoubleConverter))]
    [property: JsonPropertyName("icr")] double Icr,
    [property: JsonPropertyName("insider_selling")] string InsiderSelling,
    [property: JsonPropertyName("cds_pricing")] string CdsPricing,
    [property: JsonConverter(typeof(FlexibleBoolConverter))]
    [property: JsonPropertyName("pik_usage")] bool? PikUsage,
    [property: JsonPropertyName("note")] string? Note
);

public record CreditHealth(
    [property: JsonConverter(typeof(FlexibleDoubleConverter))]
    [property: JsonPropertyName("mid_cap_avg_icr")] double MidCapAvgIcr,
    [property: JsonConverter(typeof(FlexibleBoolConverter))]
    [property: JsonPropertyName("icr_alert")] bool? IcrAlert,
    [property: JsonPropertyName("icr_alert_note")] string? IcrAlertNote,
    [property: JsonPropertyName("sectoral_breakdown")] List<SectoralICR> SectoralBreakdown,
    [property: JsonPropertyName("pik_debt_issuance")] string PikDebtIssuance,
    [property: JsonPropertyName("pik_debt_note")] string? PikDebtNote,
    [property: JsonPropertyName("cre_delinquency_rate")] string CreDelinquencyRate,
    [property: JsonPropertyName("cre_delinquency_trend")] string? CreDelinquencyTrend,
    [property: JsonPropertyName("mid_cap_hy_oas")] string MidCapHyOas,
    [property: JsonPropertyName("mid_cap_hy_oas_note")] string? MidCapHyOasNote,
    [property: JsonPropertyName("cp_spreads")] string CpSpreads,
    [property: JsonPropertyName("cp_spreads_note")] string? CpSpreadsNote,
    [property: JsonPropertyName("vix_of_credit_cdx")] string VixOfCreditCdx,
    [property: JsonPropertyName("vix_of_credit_note")] string? VixOfCreditNote,
    [property: JsonConverter(typeof(FlexibleBoolConverter))]
    [property: JsonPropertyName("alert")] bool Alert,
    [property: JsonPropertyName("watchlist")] List<MidCapDebtWatch> Watchlist
);

public record MarketEvent(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("category")] string? Category,
    [property: JsonPropertyName("severity")] string? Severity,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("potential_impact")] string PotentialImpact
);

public record PortfolioAllocation(
    [property: JsonPropertyName("asset_class")] string AssetClass,
    [property: JsonPropertyName("percentage")] string Percentage,
    [property: JsonPropertyName("rationale")] string Rationale
);

public record MacroIndicator(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("value")] string Value,
    [property: JsonPropertyName("unit")] string? Unit,
    [property: JsonPropertyName("trend")] string? Trend,
    [property: JsonPropertyName("note")] string? Note
);

public record MacroIndicators(
    [property: JsonPropertyName("yield_curve_3m_10y")] MacroIndicator? YieldCurve3m10y,
    [property: JsonPropertyName("yield_curve_2y_10y")] MacroIndicator? YieldCurve2y10y,
    [property: JsonPropertyName("inflation_cpi")] MacroIndicator? InflationCpi,
    [property: JsonPropertyName("inflation_pce")] MacroIndicator? InflationPce,
    [property: JsonPropertyName("unemployment_rate")] MacroIndicator? UnemploymentRate,
    [property: JsonPropertyName("m2_money_supply")] MacroIndicator? M2MoneySupply,
    [property: JsonPropertyName("fed_funds_rate")] MacroIndicator? FedFundsRate
);

public record MacroDashboardResponse(
    [property: JsonPropertyName("generated_at")] string? GeneratedAt,
    [property: JsonPropertyName("calendar")] MacroCalendar Calendar,
    [property: JsonPropertyName("risk")] RiskSentiment Risk,
    [property: JsonPropertyName("crypto_contagion")] CryptoContagion? CryptoContagion,
    [property: JsonPropertyName("credit")] CreditHealth Credit,
    [property: JsonPropertyName("macro_indicators")] MacroIndicators? MacroIndicators,
    [property: JsonPropertyName("events")] List<MarketEvent> Events,
    [property: JsonPropertyName("portfolio_suggestions")] List<PortfolioAllocation> PortfolioSuggestions,
    [property: JsonPropertyName("risk_mitigation_steps")] List<string> RiskMitigationSteps,
    [property: JsonPropertyName("reasoning")] string? Reasoning
);
