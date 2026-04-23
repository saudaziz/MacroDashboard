using Microsoft.Extensions.AI;
using MacroDashboard.Backend.Tools;
using MacroDashboard.Backend.Agents;

namespace MacroDashboard.Backend.Services;

public class DashboardService
{
    private readonly Func<string, IChatClient> _chatClientFactory;
    private readonly FredTool _fredTool;
    private readonly SearchTool _searchTool;
    private readonly ILogger<DashboardService> _logger;

    private readonly IConfiguration _config;

    public DashboardService(
        Func<string, IChatClient> chatClientFactory,
        FredTool fredTool,
        SearchTool searchTool,
        ILogger<DashboardService> logger,
        IConfiguration config)
    {
        _chatClientFactory = chatClientFactory;
        _fredTool = fredTool;
        _searchTool = searchTool;
        _logger = logger;
        _config = config;
    }

    public IAsyncEnumerable<object> GenerateDashboardStreamAsync(string providerName, CancellationToken ct)
    {
        var providersSection = _config.GetSection("AI:Providers");
        var key = providersSection.GetChildren().FirstOrDefault(c => 
            c.Key.Contains(providerName, StringComparison.OrdinalIgnoreCase) || 
            providerName.Contains(c.Key, StringComparison.OrdinalIgnoreCase))?.Key 
            ?? _config["AI:DefaultProvider"] ?? "Bytedance Seed";

        var envModelName = key.Contains("Gemini", StringComparison.OrdinalIgnoreCase) 
            ? Environment.GetEnvironmentVariable("GEMINI_MODEL") 
            : null;
        var modelName = envModelName ?? providersSection.GetSection(key)["ModelName"] ?? "Unknown";

        var chatClient = _chatClientFactory(providerName);
        var agentGraph = new MacroAgentGraph(chatClient, _fredTool, _searchTool, _logger, providerName, modelName);
        return agentGraph.RunAsync(ct);
    }
}
