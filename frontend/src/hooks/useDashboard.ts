import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cancelDashboard,
  createBackendRequestPreview,
  getLatestDashboard,
  getProviders,
  streamDashboard,
  validateDashboardData,
} from '../api';
import type { MacroDashboardResponse, TokenStats } from '../types';

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
}

export interface DashboardActions {
  setProvider: (provider: string) => void;
  setSkipCache: (skipCache: boolean) => void;
  fetchDashboard: () => Promise<void>;
  cancelDashboardRequest: () => Promise<void>;
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const addProgress = useCallback((message: string) => {
    setProgressLog((prev) => {
      const next = [...prev, `${new Date().toLocaleTimeString()}: ${message}`];
      return next.length > MAX_PROGRESS_LOG ? next.slice(next.length - MAX_PROGRESS_LOG) : next;
    });
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

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setRawResponse(null);
    setReasoning(null);
    setLlmRequestContent(null);
    setDevStats(null);
    setProgressLog([]);
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
  }, [addProgress, provider, skipCache]);

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
      setProvider,
      setSkipCache,
      fetchDashboard,
      cancelDashboardRequest,
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
      fetchDashboard,
      cancelDashboardRequest,
    ],
  );
}
