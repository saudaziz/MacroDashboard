using Xunit;
using Moq;
using Microsoft.Extensions.AI;
using MacroDashboard.Backend.Services;
using MacroDashboard.Backend.Tools;
using Microsoft.Extensions.Logging;
using System.Threading;
using System.Collections.Generic;

namespace MacroDashboard.Backend.Tests;

public class DashboardServiceTests
{
    [Fact]
    public async Task GenerateDashboardStreamAsync_ReturnsUpdates()
    {
        // Arrange
        var mockChatClient = new Mock<IChatClient>();
        var mockFredTool = new Mock<FredTool>(null, null); // Simplified mock
        var mockSearchTool = new Mock<SearchTool>(null, null);
        var mockLogger = new Mock<ILogger<DashboardService>>();

        // Setup mock behaviors if necessary
        
        var service = new DashboardService(mockChatClient.Object, mockFredTool.Object, mockSearchTool.Object, mockLogger.Object);

        // Act
        var updates = new List<object>();
        await foreach (var update in service.GenerateDashboardStreamAsync(CancellationToken.None))
        {
            updates.Add(update);
        }

        // Assert
        Assert.NotEmpty(updates);
    }
}
