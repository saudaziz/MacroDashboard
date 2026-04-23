import { signalStore, withState, withMethods, patchState, withComputed } from '@ngrx/signals';
import { MacroDashboardResponse, AgentStep } from '../models/dashboard.models';
import { computed } from '@angular/core';

export interface DashboardState {
  data: MacroDashboardResponse | null;
  agentSteps: AgentStep[];
  isLoading: boolean;
  error: string | null;
  provider: string;
}

const initialState: DashboardState = {
  data: null,
  agentSteps: [],
  isLoading: false,
  error: null,
  provider: 'NVIDIA'
};

export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isFinished: computed(() => !!store.data()),
    lastStep: computed(() => store.agentSteps().length > 0 ? store.agentSteps()[store.agentSteps().length - 1] : null)
  })),
  withMethods((store) => {
    let abortController: AbortController | null = null;
    const apiUrl = 'http://127.0.0.1:5000/api/dashboard/stream';

    const executeRefresh = async (retryCount = 0): Promise<void> => {
      if (abortController && retryCount === 0) {
        abortController.abort();
      }

      if (retryCount === 0) {
        abortController = new AbortController();
        patchState(store, { isLoading: true, agentSteps: [], error: null, data: null });
      }

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: store.provider() }),
          signal: abortController?.signal
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}: ${response.statusText}`);
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
            if (line.trim().startsWith('data: ')) {
              try {
                const update = JSON.parse(line.substring(6));
                if (update.status === 'analysis_complete' && update.data) {
                  patchState(store, { data: update.data });
                } else {
                  patchState(store, (state) => ({
                    agentSteps: [...state.agentSteps, {
                      status: update.status?.toUpperCase() || 'INFO',
                      message: update.message || 'Processing...',
                      agent: update.agent
                    }]
                  }));
                }
              } catch (e) {
                console.error('Failed to parse line:', line, e);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          if (retryCount < 2) {
            console.warn(`Stream error, retrying (${retryCount + 1}/2)...`, err);
            patchState(store, (state) => ({ 
              agentSteps: [...state.agentSteps, { 
                status: 'RETRY', 
                message: `Connection lost. Retrying... (${retryCount + 1}/2)`,
                agent: 'SYSTEM'
              }] 
            }));
            await new Promise(resolve => setTimeout(resolve, 2000));
            return executeRefresh(retryCount + 1);
          }
          patchState(store, { error: err.message || 'An unknown error occurred' });
          console.error('Stream error:', err);
        }
      } finally {
        if (retryCount === 0 || !store.isLoading()) {
           patchState(store, { isLoading: false });
        }
      }
    };

    return {
      setProvider(provider: string) {
        patchState(store, { provider });
      },
      refreshDashboard: () => executeRefresh(0)
    };
  })
);
