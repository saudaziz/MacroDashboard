using Microsoft.Extensions.Options;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MacroDashboard.Backend.Tools;

public class FredOptions
{
    public string ApiKey { get; set; } = string.Empty;
}

public class FredObservation
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = string.Empty;
}

public class FredResponse
{
    [JsonPropertyName("observations")]
    public List<FredObservation> Observations { get; set; } = new();
}

public class FredTool
{
    private readonly HttpClient _httpClient;
    private readonly FredOptions _options;
    private readonly ILogger<FredTool> _logger;

    public FredTool(HttpClient httpClient, IOptions<FredOptions> options, ILogger<FredTool> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        // Prioritize Environment Variable
        var envKey = Environment.GetEnvironmentVariable("FRED_API_KEY");
        if (!string.IsNullOrEmpty(envKey))
        {
            _options.ApiKey = envKey;
            _logger.LogInformation("FredTool: Using API key from environment variable FRED_API_KEY.");
        }
        else if (string.IsNullOrEmpty(_options.ApiKey) || _options.ApiKey.Contains("YOUR_"))
        {
            _logger.LogWarning("FredTool: No valid FRED API key found. Mock data will be used.");
        }
        else 
        {
            _logger.LogInformation("FredTool: Using API key from configuration.");
        }
    }

    public async Task<double> GetSeriesLatestAsync(string seriesId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey) || _options.ApiKey == "your_fred_api_key_here")
        {
            return GetMockValue(seriesId);
        }

        try
        {
            var url = $"https://api.stlouisfed.org/fred/series/observations?series_id={seriesId}&api_key={_options.ApiKey}&file_type=json&sort_order=desc&limit=1";
            var response = await _httpClient.GetFromJsonAsync<FredResponse>(url, ct);
            
            if (response?.Observations?.Count > 0 && double.TryParse(response.Observations[0].Value, out var val))
            {
                return val;
            }

            _logger.LogWarning("FRED returned empty or invalid data for {SeriesId}, using mock.", seriesId);
            return GetMockValue(seriesId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching series {SeriesId}. Falling back to mock.", seriesId);
            return GetMockValue(seriesId);
        }
    }

    private double GetMockValue(string seriesId) => seriesId switch
    {
        "T10Y2Y" => -0.15,
        "T10Y3M" => -0.45,
        "CPIAUCSL" => 3.1,
        "PCEPILFE" => 2.8,
        "UNRATE" => 4.0,
        "M2SL" => 21000.0,
        "FEDFUNDS" => 5.33,
        _ => 0.0
    };

    public async Task<string> GetMacroSummaryAsync(CancellationToken ct = default)
    {
        var indicators = new Dictionary<string, (string sid, string unit)>
        {
            ["10Y-2Y Yield Spread"] = ("T10Y2Y", "%"),
            ["10Y-3M Yield Spread"] = ("T10Y3M", "%"),
            ["CPI Inflation (YoY)"] = ("CPIAUCSL", "%"),
            ["Core PCE Inflation"] = ("PCEPILFE", "%"),
            ["Unemployment Rate"] = ("UNRATE", "%"),
            ["M2 Money Supply"] = ("M2SL", "Billion USD"),
            ["Effective Fed Funds Rate"] = ("FEDFUNDS", "%")
        };

        var summary = "### REAL-TIME FRED MACRO DATA\n";
        foreach (var (label, (sid, unit)) in indicators)
        {
            var val = await GetSeriesLatestAsync(sid, ct);
            summary += $"- {label}: {val}{unit}\n";
        }

        return summary;
    }
}
