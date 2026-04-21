import { create } from 'zustand';
import {
  cancelDashboard,
  createBackendRequestPreview,
  getLatestDashboard,
  getProviders,
  streamDashboard,
  validateDashboardData,
  resumeWorkflow,
} from '../api';
import type { MacroDashboardResponse, TokenStats, Interrupt } from '../types';

const DEFAULT_PROVIDER = 'Bytedance Seed';
const DEFAULT_PROVIDERS = [
  'Bytedance Seed',
  'DeepSeek V3',
  'Qwen 3.5 397B',
  'Claude 3 Haiku',
  'Gemini 2.0 Flash',
  'Ollama Gemma',
];
const MAX_PROGRESS_LOG = 500;

export interface DashboardState {
  data: MacroDashboardResponse | null;
  loading: boolean;
  status: string;
  provider: string;
  providers: string[];
  skipCache: boolean;
  error: string | null;
  progressLog: string[];
  rawResponse: string | null;
  reasoning: string | null;
  requestContent: string;
  llmRequestContent: string | null;
  devStats: TokenStats | null;
  activeAgent: string | null;
  agentTrace: { agent: string; message: string; timestamp: string }[];
  interrupt: Interrupt | null;
  abortController: AbortController | null;
}

export interface DashboardActions {
  setProvider: (provider: string) => void;
  setSkipCache: (skipCache: boolean) => void;
  fetchDashboard: () => Promise<void>;
  cancelDashboardRequest: () => Promise<void>;
  handleInterrupt: (decision: 'approved' | 'rejected') => Promise<void>;
  bootstrap: () => Promise<void>;
  addProgress: (message: string) => void;
  addTrace: (agent: string, message: string) => void;
}

export const useDashboardStore = create<DashboardState & DashboardActions>((set, get) => ({
  data: null,
  loading: false,
  status: 'Agent is researching...',
  provider: DEFAULT_PROVIDER,
  providers: DEFAULT_PROVIDERS,
  skipCache: false,
  error: null,
  progressLog: [],
  rawResponse: null,
  reasoning: null,
  requestContent: '',
  llmRequestContent: null,
  devStats: null,
  activeAgent: null,
  agentTrace: [],
  interrupt: null,
  abortController: null,

  setProvider: (provider) => set({ provider }),
  setSkipCache: (skipCache) => set({ skipCache }),

  addProgress: (message) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => {
      const next = [...state.progressLog, `${timestamp}: ${message}`];
      return {
        progressLog: next.length > MAX_PROGRESS_LOG ? next.slice(next.length - MAX_PROGRESS_LOG) : next,
      };
    });
  },

  addTrace: (agent, message) => {
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({
      agentTrace: [...state.agentTrace, { agent, message, timestamp }],
    }));
  },

  bootstrap: async () => {
    let activeProviders = DEFAULT_PROVIDERS;
    try {
      const providerList = await getProviders();
      if (providerList.length > 0) {
        activeProviders = providerList;
        set({ providers: providerList });
      }
    } catch {
      // Keep fallback list.
    }

    try {
      const latest = await getLatestDashboard();
      if (!latest.dashboard_data) return;

      const validated = validateDashboardData(latest.dashboard_data);
      if (!validated) return;

      const savedProvider = latest.provider ?? DEFAULT_PROVIDER;
      const exists = activeProviders.some((p) => p.toLowerCase() === savedProvider.toLowerCase());

      set({
        data: validated,
        rawResponse: latest.raw_response ?? null,
        llmRequestContent: latest.llm_request ?? null,
        devStats: latest.token_stats ?? null,
        provider: exists ? savedProvider : DEFAULT_PROVIDER,
        status: 'Loaded last saved dashboard.',
      });
      get().addProgress('Loaded last saved dashboard from disk.');
    } catch {
      // Optional startup load.
    }
  },

  cancelDashboardRequest: async () => {
    const { abortController, addProgress } = get();
    if (!abortController) return;

    abortController.abort();
    set({
      loading: false,
      status: 'Request canceled by user.',
      error: null,
      abortController: null,
    });
    addProgress('User canceled the active request.');

    try {
      await cancelDashboard();
    } catch {
      // Server-side cancellation is best effort.
    }
  },

  handleInterrupt: async (decision) => {
    const { addProgress } = get();
    set({ interrupt: null });
    addProgress(`User ${decision}ed the interrupt.`);
    await resumeWorkflow(decision);
  },

  fetchDashboard: async () => {
    const { provider, skipCache, addProgress, addTrace } = get();

    set({
      loading: true,
      error: null,
      data: null,
      rawResponse: null,
      reasoning: null,
      llmRequestContent: null,
      devStats: null,
      progressLog: [],
      agentTrace: [],
      activeAgent: null,
      interrupt: null,
      status: 'Initializing agent...',
      requestContent: createBackendRequestPreview(provider, skipCache),
    });

    addProgress(`Request started for provider ${provider}`);
    addProgress('Backend request details recorded.');

    const controller = new AbortController();
    set({ abortController: controller });

    try {
      console.log('[Store] Starting streamDashboard generator...');
      for await (const payload of streamDashboard({ provider, skip_cache: skipCache }, controller.signal)) {
        console.log(`[Store] Received Event: ${payload.status}`, payload);

        if (payload.message) {
          set({ status: payload.message });
          addProgress(payload.message);
        }

        if (payload.status === 'agent_step') {
          set({ activeAgent: payload.agent ?? 'Unknown' });
        }

        if (payload.status === 'agent_message') {
          addTrace(payload.agent ?? 'Unknown', payload.message ?? '');
        }

        if (payload.status === 'interrupt') {
          console.warn('[Store] HITL Interrupt received:', payload);
          set({
            interrupt: {
              agent: payload.agent ?? 'System',
              message: payload.message ?? 'Intervention required.',
              data: (payload as any).data,
            },
          });
        }

        if (payload.status === 'snapshot') {
          console.log(`[Store] Processing snapshot for section: ${payload.section}`);
          set((state) => {
            const currentData = state.data || {
              calendar: { dates: [], rates: [] },
              risk: { score: 5, summary: '' },
              credit: { mid_cap_avg_icr: 0, sectoral_breakdown: [], pik_debt_issuance: 'N/A', cre_delinquency_rate: 'N/A', watchlist: [], alert: false },
              events: [],
              portfolio_suggestions: [],
              risk_mitigation_steps: [],
            };
            
            const updated = { ...currentData } as MacroDashboardResponse;
            
            if (payload.section === 'calendar' && payload.data) updated.calendar = payload.data as any;
            if (payload.section === 'risk' && payload.data) updated.risk = payload.data as any;
            if (payload.section === 'credit' && payload.data) updated.credit = payload.data as any;
            if (payload.section === 'macro_indicators' && payload.data) updated.macro_indicators = payload.data as any;
            if (payload.section === 'strategy' && payload.data) {
              const strategyData = payload.data as any;
              updated.events = strategyData.events || updated.events || [];
              updated.portfolio_suggestions = strategyData.portfolio_suggestions || updated.portfolio_suggestions || [];
              updated.risk_mitigation_steps = strategyData.risk_mitigation_steps || updated.risk_mitigation_steps || [];
            }
            return { data: updated };
          });
        }

        if (payload.llm_request) set({ llmRequestContent: payload.llm_request });
        if (payload.token_stats) set({ devStats: payload.token_stats });

        if (payload.status === 'thinking_complete') {
          console.log('[Store] Thinking complete. Reasoning length:', payload.reasoning?.length || 0);
          if (payload.reasoning) set({ reasoning: payload.reasoning });
        }

        if (payload.status === 'analysis_complete') {
          console.log('[Store] Analysis complete received. Validating final payload...');
          const validated = validateDashboardData(payload.data);
          if (!validated) {
            console.error('[Store] FINAL VALIDATION FAILED on payload.data:', payload.data);
            set({ error: 'Invalid dashboard payload returned by backend.', loading: false });
            break;
          }
          console.log('[Store] FINAL VALIDATION SUCCESS. Setting final state.');
          set({
            data: validated,
            rawResponse: payload.raw_response ?? null,
            reasoning: validated.reasoning || get().reasoning,
            activeAgent: null,
            loading: false,
          });
        } else if (payload.status === 'error') {
          console.error('[Store] Received ERROR status from backend:', payload.message);
          set({
            error: payload.message ?? 'Unknown stream error',
            rawResponse: payload.raw_response ?? null,
            loading: false,
          });
        }
      }
      console.log('[Store] Stream loop finished normally.');
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        set({
          status: 'Request canceled by user.',
          error: null,
          rawResponse: 'Request canceled by user.',
        });
      } else {
        set({
          error: error.message || 'Failed to fetch dashboard data. Make sure the backend is running.',
        });
      }
    } finally {
      set({ abortController: null, loading: false });
    }
  },
}));
