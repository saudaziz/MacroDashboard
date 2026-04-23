using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Extensions.AI;
using MacroDashboard.Backend.Models;
using MacroDashboard.Backend.Tools;
using Polly;
using Polly.Retry;

namespace MacroDashboard.Backend.Agents;

/// <summary>
/// Implements a multi-agent workflow graph for macroeconomic research and analysis.
/// </summary>
public class MacroAgentGraph
{
    private readonly IChatClient _chatClient;
    private readonly FredTool _fredTool;
    private readonly SearchTool _searchTool;
    private readonly ILogger _logger;
    private readonly string _providerName;
    private readonly int _year;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip
    };

    private static readonly ResiliencePipeline<object?> _retryPipeline = new ResiliencePipelineBuilder<object?>()
        .AddRetry(new RetryStrategyOptions<object?>
        {
            ShouldHandle = new PredicateBuilder<object?>().Handle<JsonException>().Handle<ArgumentException>(),
            BackoffType = DelayBackoffType.Exponential,
            MaxRetryAttempts = 2,
            Delay = TimeSpan.FromSeconds(1),
            OnRetry = args =>
            {
                Console.WriteLine($"Retrying due to: {args.Outcome.Exception?.Message}");
                return default;
            }
        })
        .Build();

    public MacroAgentGraph(
        IChatClient chatClient, 
        FredTool fredTool, 
        SearchTool searchTool, 
        ILogger logger, 
        string providerName)
    {
        _chatClient = chatClient;
        _fredTool = fredTool;
        _searchTool = searchTool;
        _logger = logger;
        _providerName = providerName;
        _year = DateTime.Now.Year;
    }

    public async IAsyncEnumerable<object> RunAsync([EnumeratorCancellation] CancellationToken ct)
    {
        _logger.LogInformation("AgentGraph: Starting workflow with {Provider}", _providerName);

        // Node 1: Lead Researcher (Data Gathering)
        yield return new { status = "research_start", message = "Lead Researcher: Gathering macroeconomic data from FRED and Web.", agent = "Lead_Researcher" };
        var researchContext = await ExecuteLeadResearcherAsync(ct);

        // Node 2: Coordinator (Routing)
        yield return new { status = "routing", message = "Coordinator: Distributing research to specialized agent swarm.", agent = "Coordinator" };

        // Nodes 3-7: Specialist Analysts (Parallel Execution)
        var calendarTask = ExecuteAnalystAsync<MacroCalendar>("Calendar", 
            $"Extract ALL significant macro release dates for {_year}. Return JSON: {{ \"dates\": [{{ \"event\": \"string\", \"last_date\": \"string\", \"next_date\": \"string\", \"signal\": \"string\" }}], \"rates\": [{{ \"bank\": \"string\", \"rate\": \"string\", \"guidance\": \"string\" }}] }}", researchContext, ct);
        
        var riskTask = ExecuteAnalystAsync<RiskSentiment>("Risk", 
            $"Deep dive into systemic risk for {_year}. Return JSON: {{ \"score\": number (0-10), \"label\": \"string\", \"summary\": \"string\", \"gold_technical\": \"string\", \"usd_technical\": \"string\", \"safe_haven_analysis\": \"string\", \"contagion_analysis\": \"string\" }}", researchContext, ct);
        
        var creditTask = ExecuteAnalystAsync<CreditHealth>("Credit", 
            $"Analyze mid-cap credit health. Return JSON: {{ \"mid_cap_avg_icr\": number, \"sectoral_breakdown\": [{{ \"sector\": \"string\", \"average_icr\": number }}], \"pik_debt_issuance\": \"string\", \"cre_delinquency_rate\": \"string\", \"alert\": boolean, \"watchlist\": [{{ \"firm_name\": \"string\", \"debt_load\": \"string\", \"icr\": number, \"insider_selling\": \"string\", \"cds_pricing\": \"string\" }}] }}", researchContext, ct);
        
        var strategyTask = ExecuteAnalystAsync<dynamic>("Strategy", 
            $"Generate actionable portfolio advice for {_year}. Return JSON: {{ \"events\": [{{ \"title\": \"string\", \"category\": \"string\", \"severity\": \"CRITICAL|HIGH|NORMAL\", \"description\": \"string\", \"potential_impact\": \"string\" }}], \"portfolio_suggestions\": [{{ \"asset_class\": \"string\", \"percentage\": \"string\", \"rationale\": \"string\" }}], \"risk_mitigation_steps\": [\"string\"] }}", researchContext, ct);

        var indicatorTask = ExecuteAnalystAsync<MacroIndicators>("Indicators",
            "Synthesize core indicators. Return JSON: { \"yield_curve_2y_10y\": { \"name\": \"string\", \"value\": \"string\", \"unit\": \"%\", \"trend\": \"UP|DOWN|STABLE\" }, \"inflation_cpi\": { ... }, \"unemployment_rate\": { ... }, \"fed_funds_rate\": { ... } }", researchContext, ct);

        await Task.WhenAll(calendarTask, riskTask, creditTask, strategyTask, indicatorTask);

        // Node 8: Verifier (Aggregation & Validation)
        yield return new { status = "thinking_complete", message = "Verifier: Aggregating and cross-checking specialist reports.", agent = "Verifier" };
        
        var finalReport = await AggregateReportsAsync(
            await calendarTask, 
            await riskTask, 
            await creditTask, 
            await indicatorTask,
            await strategyTask);

        yield return new { status = "analysis_complete", data = finalReport };
    }

    private async Task<string> ExecuteLeadResearcherAsync(CancellationToken ct)
    {
        var fredSummary = await _fredTool.GetMacroSummaryAsync(ct);
        var searchSummary = await _searchTool.SearchAsync($"breaking macroeconomic news major market events and credit outlook {_year} G7 central banks", ct);
        return $"{fredSummary}\n\n{searchSummary}";
    }

    private async Task<T?> ExecuteAnalystAsync<T>(string role, string instruction, string context, CancellationToken ct)
    {
        var result = await _retryPipeline.ExecuteAsync(async token =>
        {
            var prompt = $"As a {role} Analyst, {instruction}\n\nContext:\n{context}\n\nOutput ONLY valid JSON matching the exact schema above. No preamble, no markdown formatting.";
            var response = await _chatClient.GetResponseAsync(prompt, cancellationToken: token);
            var content = response.Text?.Trim() ?? "";

            content = CleanJson(content);

            try
            {
                var deserialized = JsonSerializer.Deserialize<T>(content, _jsonOptions);
                if (deserialized == null) throw new JsonException("Deserialization returned null.");
                return (object?)deserialized;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning("AgentGraph: {Role} Analyst returned invalid JSON. Content: {Content}. Error: {Msg}", role, content, ex.Message);
                throw;
            }
        }, ct);

        return (T?)result;
    }

    private string CleanJson(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return "{}";

        // Remove markdown blocks
        if (content.Contains("```json"))
        {
            var start = content.IndexOf("```json") + 7;
            var end = content.LastIndexOf("```");
            if (end > start)
                content = content[start..end].Trim();
        }
        else if (content.StartsWith("```"))
        {
            var start = 3;
            var end = content.LastIndexOf("```");
            if (end > start)
                content = content[start..end].Trim();
        }

        // Final fallback: try to find the first { and last }
        var firstBrace = content.IndexOf('{');
        var lastBrace = content.LastIndexOf('}');
        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace)
        {
            content = content.Substring(firstBrace, lastBrace - firstBrace + 1);
        }

        return content;
    }

    private Task<MacroDashboardResponse> AggregateReportsAsync(
        MacroCalendar? calendar, 
        RiskSentiment? risk, 
        CreditHealth? credit, 
        MacroIndicators? indicators,
        dynamic strategy)
    {
        var events = new List<MarketEvent>();
        var suggestions = new List<PortfolioAllocation>();
        var mitigation = new List<string>();

        try {
            if (strategy is JsonElement element && element.ValueKind == JsonValueKind.Object)
            {
                if (element.TryGetProperty("events", out var evProp))
                {
                    try {
                        events = JsonSerializer.Deserialize<List<MarketEvent>>(evProp.GetRawText(), _jsonOptions) ?? new();
                    } catch (Exception ex) { _logger.LogWarning("Verifier: Failed to deserialize events: {Msg}", ex.Message); }
                }

                if (element.TryGetProperty("portfolio_suggestions", out var sugProp))
                {
                    try {
                        suggestions = JsonSerializer.Deserialize<List<PortfolioAllocation>>(sugProp.GetRawText(), _jsonOptions) ?? new();
                    } catch (Exception ex) { _logger.LogWarning("Verifier: Failed to deserialize suggestions: {Msg}", ex.Message); }
                }

                if (element.TryGetProperty("risk_mitigation_steps", out var mitProp))
                {
                    try {
                        if (mitProp.ValueKind == JsonValueKind.Array)
                            mitigation = JsonSerializer.Deserialize<List<string>>(mitProp.GetRawText(), _jsonOptions) ?? new();
                        else
                            mitigation = new List<string> { mitProp.GetString() ?? "" };
                    } catch (Exception ex) { _logger.LogWarning("Verifier: Failed to deserialize mitigation: {Msg}", ex.Message); }
                }
            }
        } catch (Exception ex) {
            _logger.LogError("Verifier: Fatal aggregation error: {Msg}", ex.Message);
        }

        var response = new MacroDashboardResponse(
            GeneratedAt: DateTime.UtcNow.ToString("O"),
            Calendar: calendar ?? new MacroCalendar(new(), new(), new()),
            Risk: risk ?? new RiskSentiment(5.0, "NEUTRAL", "Research incomplete", null, null, null, null, null, null),
            CryptoContagion: null,
            Credit: credit ?? new CreditHealth(0, false, null, new(), "N/A", null, "N/A", null, "N/A", null, "N/A", null, "N/A", null, false, new()),
            MacroIndicators: indicators,
            Events: events,
            PortfolioSuggestions: suggestions,
            RiskMitigationSteps: mitigation,
            Reasoning: $"Analysis completed by {_providerName} verified agent graph."
        );

        return Task.FromResult(response);
    }
}
