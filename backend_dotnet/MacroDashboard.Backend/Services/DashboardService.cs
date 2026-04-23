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

    public DashboardService(
        Func<string, IChatClient> chatClientFactory,
        FredTool fredTool,
        SearchTool searchTool,
        ILogger<DashboardService> logger)
    {
        _chatClientFactory = chatClientFactory;
        _fredTool = fredTool;
        _searchTool = searchTool;
        _logger = logger;
    }

    public IAsyncEnumerable<object> GenerateDashboardStreamAsync(string providerName, CancellationToken ct)
    {
        var chatClient = _chatClientFactory(providerName);
        var agentGraph = new MacroAgentGraph(chatClient, _fredTool, _searchTool, _logger, providerName);
        return agentGraph.RunAsync(ct);
    }
}
