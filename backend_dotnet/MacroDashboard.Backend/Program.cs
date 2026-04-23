using System.Text.Json;
using System.ClientModel;
using Azure;
using Azure.AI.OpenAI;
using OpenAI;
using Microsoft.Extensions.AI;
using MacroDashboard.Backend.Services;
using MacroDashboard.Backend.Tools;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog for file logging
var logPath = Path.Combine(Environment.GetEnvironmentVariable("MACRO_LOG_ROOT") ?? @"C:\Logs\MacroDashboard", "backend.log");
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(logPath, rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Configure Tools and Services
builder.Services.Configure<FredOptions>(builder.Configuration.GetSection("Fred"));
builder.Services.AddHttpClient<FredTool>().AddStandardResilienceHandler();
builder.Services.AddHttpClient<SearchTool>().AddStandardResilienceHandler();
builder.Services.AddScoped<DashboardService>();

// Register IChatClient providers
builder.Services.AddSingleton<Func<string, IChatClient>>(sp => 
{
    var config = sp.GetRequiredService<IConfiguration>();
    return (string providerName) => CreateChatClient(config, providerName);
});

builder.Services.AddCors(options => options.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();
app.UseCors("AllowAll");

app.MapPost("/api/dashboard/stream", async (DashboardRequest req, DashboardService service, HttpContext context, CancellationToken ct) =>
{
    context.Response.ContentType = "text/event-stream";
    var provider = req.Provider ?? "Default";
    try 
    {
        Log.Information("Starting dashboard stream for provider: {Provider}", provider);
        await foreach (var update in service.GenerateDashboardStreamAsync(provider, ct))
        {
            await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(update)}\n\n", ct);
            await context.Response.Body.FlushAsync(ct);
        }
    }
    catch (Exception ex)
    {
        Log.Error(ex, "Stream error for provider {Provider}. Details: {Msg}", provider, ex.Message);
        var errorUpdate = new { status = "error", message = $"Stream error: {ex.Message}", agent = "SYSTEM" };
        await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(errorUpdate)}\n\n", ct);
    }
});

app.MapGet("/api/status", () => new { status = "ok", message = ".NET 10 Backend Running" });

try 
{
    Log.Information("Starting MacroDashboard Backend...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

static IChatClient CreateChatClient(IConfiguration config, string providerName)
{
    var providersSection = config.GetSection("AI:Providers");
    
    var key = providersSection.GetChildren().FirstOrDefault(c => 
        c.Key.Contains(providerName, StringComparison.OrdinalIgnoreCase) || 
        providerName.Contains(c.Key, StringComparison.OrdinalIgnoreCase))?.Key 
        ?? config["AI:DefaultProvider"] ?? "Bytedance Seed";

    var section = providersSection.GetSection(key);
    var endpoint = section["Endpoint"] ?? "";
    
    // Model Name Overrides (matching Python naming convention)
    // Priority: Environment Variable > appsettings.json
    var providerType = key.Split(' ')[0].ToUpper();
    var envModelName = Environment.GetEnvironmentVariable($"{providerType}_MODEL");
    var modelName = envModelName ?? section["ModelName"] ?? "Unknown";
    
    // API Key Overrides with multiple variations (matching Python implementation)
    string? apiKey = null;
    if (key.Contains("Gemini", StringComparison.OrdinalIgnoreCase))
        apiKey = Environment.GetEnvironmentVariable("GOOGLE_API_KEY") ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
    else if (key.Contains("Claude", StringComparison.OrdinalIgnoreCase))
        apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") ?? Environment.GetEnvironmentVariable("CLAUDE_API_KEY");
    else
    {
        apiKey = Environment.GetEnvironmentVariable($"{providerType}_API_KEY") ?? Environment.GetEnvironmentVariable("NVIDIA_API_KEY");
    }

    apiKey ??= section["ApiKey"];

    if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("YOUR_"))
    {
        Log.Warning("ChatClient: No valid API key found for {Provider}. Requests will fail.", key);
    }
    else
    {
        Log.Information("ChatClient: Initializing {Provider} with model {Model} (Source: {Source})", 
            key, modelName, string.IsNullOrEmpty(envModelName) ? "Config" : "Environment");
    }

    IChatClient client;
    if (key.Contains("Claude", StringComparison.OrdinalIgnoreCase))
    {
        client = new SimpleClaudeChatClient(apiKey ?? "", modelName);
    }
    else if (key.Contains("Gemini", StringComparison.OrdinalIgnoreCase))
    {
        client = new SimpleGeminiChatClient(apiKey ?? "", modelName);
    }
    else if (key.Contains("Ollama", StringComparison.OrdinalIgnoreCase))
    {
        var baseUrl = (endpoint ?? "").EndsWith("/v1") ? endpoint! : $"{endpoint?.TrimEnd('/')}/v1";
        var openAiClient = new OpenAIClient(new System.ClientModel.ApiKeyCredential("ollama"), new OpenAIClientOptions { Endpoint = new Uri(baseUrl) });
        client = openAiClient.GetChatClient(modelName).AsIChatClient();
    }
    else if (endpoint != null && endpoint.Contains("openai.azure.com"))
    {
        var azureClient = new AzureOpenAIClient(new Uri(endpoint), new System.ClientModel.ApiKeyCredential(apiKey ?? ""));
        client = azureClient.GetChatClient(modelName).AsIChatClient();
    }
    else
    {
        var baseUrl = (endpoint ?? "").EndsWith("/chat/completions") ? endpoint!.Replace("/chat/completions", "") : endpoint;
        var openAiClient = new OpenAIClient(new System.ClientModel.ApiKeyCredential(apiKey ?? ""), new OpenAIClientOptions { Endpoint = new Uri(baseUrl ?? "https://api.openai.com/v1") });
        client = openAiClient.GetChatClient(modelName).AsIChatClient();
    }
    
    return client.AsBuilder().UseFunctionInvocation().Build();
}

public record DashboardRequest(string? Provider);
