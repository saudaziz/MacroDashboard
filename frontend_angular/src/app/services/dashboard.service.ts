import { Injectable, signal } from '@angular/core';
import { MacroDashboardResponse, AgentStep } from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://127.0.0.1:5000/api/dashboard/stream';

  // Signals for UI
  latestData = signal<MacroDashboardResponse | null>(null);
  agentSteps = signal<AgentStep[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  
  // Provider state
  provider = signal<string>('NVIDIA');
  providers = ['NVIDIA', 'AzureOpenAI', 'OpenAI', 'Ollama'];

  private abortController: AbortController | null = null;

  async refreshDashboard() {
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = new AbortController();
    this.isLoading.set(true);
    this.agentSteps.set([]);
    this.error.set(null);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: this.provider() }),
        signal: this.abortController.signal
      });

      if (!response.body) throw new Error('Stream not available');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              this.handleStreamUpdate(data);
            } catch (e) {
              console.error('Failed to parse line:', line, e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        this.error.set(err.message);
        console.error('Stream error:', err);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private handleStreamUpdate(update: any) {
    if (update.status === 'analysis_complete' && update.data) {
      this.latestData.set(update.data);
    } else {
      this.agentSteps.update(steps => [...steps, { 
        status: update.status?.toUpperCase() || 'INFO', 
        message: update.message || 'Processing...',
        agent: update.agent
      }]);
    }
  }

  setProvider(name: string) {
    this.provider.set(name);
  }
}
