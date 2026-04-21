import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
}

export interface DashboardActions {
  setProvider: (provider: string) => void;
  setSkipCache: (skipCache: boolean) => void;
  fetchDashboard: () => Promise<void>;
  cancelDashboardRequest: () => Promise<void>;
  handleInterrupt: (decision: 'approved' | 'rejected') => Promise<void>;
}

export function useDashboard(): DashboardState & DashboardActions {
  const [data, setData] = useState<MacroDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Agent is researching...');
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [providers, setProviders] = useState<string[]>(DEFAULT_PROVIDERS);
  const [skipCache, setSkipCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [requestContent, setRequestContent] = useState('');
  const [llmRequestContent, setLlmRequestContent] = useState<string | null>(null);
  const [devStats, setDevStats] = useState<TokenStats | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentTrace, setAgentTrace] = useState<{ agent: string; message: string; timestamp: string }[]>([]);
  const [interrupt, setInterrupt] = useState<Interrupt | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addProgress = useCallback((message: string) => {
    setProgressLog((prev) => {
      const next = [...prev, `${new Date().toLocaleTimeString()}: ${message}`];
      return next.length > MAX_PROGRESS_LOG ? next.slice(next.length - MAX_PROGRESS_LOG) : next;
    });
  }, []);

  const addTrace = useCallback((agent: string, message: string) => {
    setAgentTrace((prev) => [
      ...prev,
      { agent, message, timestamp: new Date().toLocaleTimeString() },
    ]);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      let activeProviders = DEFAULT_PROVIDERS;
      try {
        const providerList = await getProviders();
        if (mounted && providerList.length > 0) {
          activeProviders = providerList;
          setProviders(providerList);
        }
      } catch {
        // Keep fallback list.
      }

      try {
        const latest = await getLatestDashboard();
        if (!mounted || !latest.dashboard_data) {
          return;
        }

        const validated = validateDashboardData(latest.dashboard_data);
        if (!validated) {
          return;
        }

        setData(validated);
        setRawResponse(latest.raw_response ?? null);
        setLlmRequestContent(latest.llm_request ?? null);
        setDevStats(latest.token_stats ?? null);
        
        // Ensure saved provider still exists in current registry
        const savedProvider = latest.provider ?? DEFAULT_PROVIDER;
        const exists = activeProviders.some(p => p.toLowerCase() === savedProvider.toLowerCase());
        
        setProvider(exists ? savedProvider : DEFAULT_PROVIDER);
        setStatus('Loaded last saved dashboard.');
        addProgress('Loaded last saved dashboard from disk.');
      } catch {
        // Optional startup load.
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [addProgress]);

  const cancelDashboardRequest = useCallback(async () => {
    if (!abortControllerRef.current) {
      return;
    }

    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setStatus('Request canceled by user.');
    setError(null);
    addProgress('User canceled the active request.');

    try {
      await cancelDashboard();
    } catch {
      // Server-side cancellation is best effort.
    }
  }, [addProgress]);

  const handleInterrupt = useCallback(async (decision: 'approved' | 'rejected') => {
    setInterrupt(null);
    addProgress(`User ${decision}ed the interrupt.`);
    await resumeWorkflow(decision);
  }, [addProgress]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setRawResponse(null);
    setReasoning(null);
    setLlmRequestContent(null);
    setDevStats(null);
    setProgressLog([]);
    setAgentTrace([]);
    setActiveAgent(null);
    setInterrupt(null);
    setStatus('Initializing agent...');

    setRequestContent(createBackendRequestPreview(provider, skipCache));
    addProgress(`Request started for provider ${provider}`);
    addProgress('Backend request details recorded.');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      for await (const payload of streamDashboard({ provider, skip_cache: skipCache }, controller.signal)) {
        if (payload.message) {
          setStatus(payload.message);
          addProgress(payload.message);
        }

        if (payload.status === 'agent_step') {
          setActiveAgent(payload.agent ?? 'Unknown');
        }

        if (payload.status === 'agent_message') {
          addTrace(payload.agent ?? 'Unknown', payload.message ?? '');
        }

        if (payload.status === 'interrupt') {
          setInterrupt({
            agent: payload.agent ?? 'System',
            message: payload.message ?? 'Intervention required.',
            data: (payload as any).data
          });
        }

        if (payload.status === 'snapshot') {
           // Partial data update
           setData(prev => {
             const updated = { ...(prev || {}) } as MacroDashboardResponse;
             if (payload.section === 'calendar') updated.calendar = payload.data as any;
             if (payload.section === 'risk') updated.risk = payload.data as any;
             if (payload.section === 'credit') updated.credit = payload.data as any;
             // Events and suggestions come in the strategy section
             if (payload.section === 'strategy') {
                updated.events = (payload.data as any).events || [];
                updated.portfolio_suggestions = (payload.data as any).portfolio_suggestions || [];
                updated.risk_mitigation_steps = (payload.data as any).risk_mitigation_steps || [];
             }
             return updated;
           });
        }

        if (payload.llm_request) {
          setLlmRequestContent(payload.llm_request);
        }

        if (payload.token_stats) {
          setDevStats(payload.token_stats);
        }

        if (payload.status === 'thinking_complete') {
          if (payload.reasoning) {
            setReasoning(payload.reasoning);
          }
        }

        if (payload.status === 'analysis_complete') {
          const validated = validateDashboardData(payload.data);
          if (!validated) {
            setError('Invalid dashboard payload returned by backend.');
            break;
          }
          setData(validated);
          setRawResponse(payload.raw_response ?? null);
          if (validated.reasoning) {
            setReasoning(validated.reasoning);
          }
          setActiveAgent(null);
          setLoading(false);
        } else if (payload.status === 'error') {
          setError(payload.message ?? 'Unknown stream error');
          setRawResponse(payload.raw_response ?? null);
          setLoading(false);
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        setStatus('Request canceled by user.');
        setError(null);
        setRawResponse('Request canceled by user.');
      } else {
        setError(error.message || 'Failed to fetch dashboard data. Make sure the backend is running.');
      }
      setLoading(false);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, [addProgress, addTrace, provider, skipCache]);

  return useMemo(
    () => ({
      data,
      loading,
      status,
      provider,
      providers,
      skipCache,
      error,
      progressLog,
      rawResponse,
      reasoning,
      requestContent,
      llmRequestContent,
      devStats,
      activeAgent,
      agentTrace,
      interrupt,
      setProvider,
      setSkipCache,
      fetchDashboard,
      cancelDashboardRequest,
      handleInterrupt,
    }),
    [
      data,
      loading,
      status,
      provider,
      providers,
      skipCache,
      error,
      progressLog,
      rawResponse,
      reasoning,
      requestContent,
      llmRequestContent,
      devStats,
      activeAgent,
      agentTrace,
      interrupt,
      fetchDashboard,
      cancelDashboardRequest,
      handleInterrupt,
    ],
  );
}
