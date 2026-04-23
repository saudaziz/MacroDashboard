using Microsoft.Extensions.AI;
using System.Net.Http.Json;
using System.Text.Json;
using System.Runtime.CompilerServices;

namespace MacroDashboard.Backend.Tools;

public class SimpleGeminiChatClient : IChatClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;

    public SimpleGeminiChatClient(string apiKey, string model = "gemini-3.1-flash-lite-preview")
    {
        _httpClient = new HttpClient { BaseAddress = new Uri("https://generativelanguage.googleapis.com") };
        _apiKey = apiKey;
        _model = model;
    }

    public void Dispose() => _httpClient.Dispose();

    public Task<ChatResponse> GetResponseAsync(IEnumerable<ChatMessage> messages, ChatOptions? options = null, CancellationToken cancellationToken = default)
    {
        var systemMessage = messages.FirstOrDefault(m => m.Role == ChatRole.System)?.Text;
        var userMessages = messages.Where(m => m.Role == ChatRole.User).Select(m => new 
        { 
            role = "user", 
            parts = new[] { new { text = m.Text } } 
        }).ToList();

        // If system message exists, Google API expects it in 'system_instruction'
        var requestBody = new
        {
            contents = userMessages,
            system_instruction = systemMessage != null ? new { parts = new[] { new { text = systemMessage } } } : null,
            generationConfig = new
            {
                maxOutputTokens = 4096,
                temperature = 0.7
            }
        };

        return Task.Run(async () => {
            var url = $"/v1beta/models/{_model}:generateContent?key={_apiKey}";
            var response = await _httpClient.PostAsJsonAsync(url, requestBody, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new HttpRequestException($"Gemini API error: {response.StatusCode} - {errorBody}");
            }

            var result = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            var text = result.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString() ?? "";
            
            return new ChatResponse(new ChatMessage(ChatRole.Assistant, text));
        }, cancellationToken);
    }

    public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(IEnumerable<ChatMessage> messages, ChatOptions? options = null, [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var response = await GetResponseAsync(messages, options, cancellationToken);
        var text = response.Messages.FirstOrDefault()?.Text ?? "";
        yield return new ChatResponseUpdate { Role = ChatRole.Assistant, Contents = { new TextContent(text) } };
    }

    public object? GetService(Type serviceType, object? serviceKey = null) => serviceType == typeof(SimpleGeminiChatClient) ? this : null;
}
