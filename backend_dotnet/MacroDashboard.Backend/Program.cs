using System.Text.Json;
using System.ClientModel;
using Azure;
using Azure.AI.OpenAI;
using OpenAI;
using Microsoft.Extensions.AI;
using MacroDashboard.Backend.Services;
using MacroDashboard.Backend.Tools;

var builder = WebApplication.CreateBuilder(args);

// Configure AI via appsettings
var aiConfig = builder.Configuration.GetSection("AI");
var endpoint = aiConfig["Endpoint"] ?? "";
var apiKey = aiConfig["ApiKey"] ?? "";
var modelName = aiConfig["ModelName"] ?? "";

builder.Services.AddChatClient(b => {
    var aiConfig = builder.Configuration.GetSection("AI");
    var endpoint = aiConfig["Endpoint"] ?? "";
    var apiKey = aiConfig["ApiKey"] ?? "";
    var modelName = aiConfig["ModelName"] ?? "";

    IChatClient client;
    if (endpoint.Contains("openai.azure.com"))
    {
        var azureClient = new AzureOpenAIClient(new Uri(endpoint), new System.ClientModel.ApiKeyCredential(apiKey));
        client = azureClient.GetChatClient(modelName).AsIChatClient();
    }
    else
    {
        var baseUrl = endpoint.Replace("/chat/completions", "");
        var openAiClient = new OpenAIClient(new System.ClientModel.ApiKeyCredential(apiKey), new OpenAIClientOptions { Endpoint = new Uri(baseUrl) });
        client = openAiClient.GetChatClient(modelName).AsIChatClient();
    }
    
    return client.AsBuilder().UseFunctionInvocation().Build();
});

// Factory to resolve IChatClient by name (currently just returns the default for simplicity, but ready for expansion)
builder.Services.AddSingleton<Func<string, IChatClient>>(sp => (name) => sp.GetRequiredService<IChatClient>());


// Tools and Services
builder.Services.Configure<FredOptions>(builder.Configuration.GetSection("Fred"));
builder.Services.AddHttpClient<FredTool>().AddStandardResilienceHandler();
builder.Services.AddHttpClient<SearchTool>().AddStandardResilienceHandler();
builder.Services.AddScoped<DashboardService>();

builder.Services.AddCors(options => options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();
app.UseCors("AllowAll");

app.MapPost("/api/dashboard/stream", async (DashboardRequest req, DashboardService service, HttpContext context, CancellationToken ct) =>
{
    context.Response.ContentType = "text/event-stream";
    var provider = req.Provider ?? "NVIDIA";
    try 
    {
        await foreach (var update in service.GenerateDashboardStreamAsync(provider, ct))
        {
            await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(update)}\n\n", ct);
            await context.Response.Body.FlushAsync(ct);
        }
    }
    catch (Exception ex)
    {
        var errorUpdate = new { status = "error", message = $"Stream error: {ex.Message}", agent = "SYSTEM" };
        await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(errorUpdate)}\n\n", ct);
    }
});

app.MapGet("/api/status", () => new { status = "ok", message = ".NET 10 Backend Running" });

app.Run();

public record DashboardRequest(string? Provider);
