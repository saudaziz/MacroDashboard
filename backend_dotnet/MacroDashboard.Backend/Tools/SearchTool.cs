namespace MacroDashboard.Backend.Tools;

public class SearchTool
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<SearchTool> _logger;

    public SearchTool(HttpClient httpClient, ILogger<SearchTool> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<string> SearchAsync(string query, CancellationToken ct = default)
    {
        _logger.LogInformation("Searching for: {Query}", query);
        
        // Mock implementation for search to avoid API dependency issues during migration
        await Task.Delay(500, ct); // Simulate network latency
        
        return $"""
            ### SEARCH RESULTS FOR: {query}
            - Latest macro trends indicate cautious optimism in G7 markets.
            - Credit conditions are tightening for mid-cap firms due to high interest rates.
            - Crypto-equity correlation remains high as BTC tracks tech stocks.
            - Geopolitical tensions in the Middle East are being monitored for oil price impact.
            """;
    }
}
