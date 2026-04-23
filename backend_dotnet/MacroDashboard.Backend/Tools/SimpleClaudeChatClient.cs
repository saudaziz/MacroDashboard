using Microsoft.Extensions.AI;
using System.Net.Http.Json;
using System.Text.Json;
using System.Runtime.CompilerServices;

namespace MacroDashboard.Backend.Tools;

public class SimpleClaudeChatClient : IChatClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;

    public SimpleClaudeChatClient(string apiKey, string model = "claude-3-haiku-20240307")
    {
        _httpClient = new HttpClient { BaseAddress = new Uri("https://api.anthropic.com") };
        _apiKey = apiKey;
        _model = model;
        
        _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public void Dispose() => _httpClient.Dispose();

    public Task<ChatResponse> GetResponseAsync(IEnumerable<ChatMessage> messages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        var systemMessage = messages.FirstOrDefault(m => m.Role == ChatRole.System)?.Text;
        var userMessages = messages.Where(m => m.Role == ChatRole.User).Select(m => new { role = "user", content = m.Text }).ToList();

        var requestBody = new
        {
            model = _model,
            max_tokens = 4096,
            system = systemMessage,
            messages = userMessages
        };

        return Task.Run(async () => {
            var response = await _httpClient.PostAsJsonAsync("/v1/messages", requestBody, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"Claude API error: {response.StatusCode} - {errorBody}");
            }

            var result = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            var text = result.GetProperty("content")[0].GetProperty("text").GetString() ?? "";
            
            return new ChatResponse(new ChatMessage(ChatRole.Assistant, text));
        }, cancellationToken);
    }

    public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(IEnumerable<ChatMessage> messages, ChatOptions? options = null, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var response = await GetResponseAsync(messages, options, cancellationToken);
        var text = response.Messages.FirstOrDefault()?.Text ?? "";
        yield return new ChatResponseUpdate { Role = ChatRole.Assistant, Contents = { new TextContent(text) } };
    }

    public object? GetService(Type serviceType, object? serviceKey = null) => serviceType == typeof(SimpleClaudeChatClient) ? this : null;
}
