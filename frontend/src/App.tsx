import { useEffect, useState } from 'react';
import type { 
  MacroDashboardResponse 
} from './types';
import { Calendar } from './components/Calendar';
import { RiskGauge } from './components/RiskGauge';
import { CreditPanel } from './components/CreditPanel';
import { EventsFeed } from './components/EventsFeed';
import { PortfolioAdvice } from './components/PortfolioAdvice';
import { Card, SectionTitle, MetricBig, Tag } from './components/UIAtoms';
import { COLORS } from './theme';
import { Settings, RefreshCw, Loader2, AlertTriangle, Shield } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [data, setData] = useState<MacroDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Agent is researching...');
  const [provider, setProvider] = useState('Gemini');
  const [providers, setProviders] = useState<string[]>(['Gemini', 'Ollama', 'Claude', 'Nvidia']);
  const [error, setError] = useState<string | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [requestContent, setRequestContent] = useState<string>('');
  const [llmRequestContent, setLlmRequestContent] = useState<string | null>(null);
  const [devStats, setDevStats] = useState<{ request_tokens?: number; response_tokens?: number; total_tokens?: number } | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const addProgress = (message: string) => {
    setProgressLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/providers`);
        if (response.ok) {
          const list = await response.json();
          setProviders(list);
        }
      } catch (err) {
        console.warn('Failed to fetch provider list.', err);
      }
    };

    const loadLatestDashboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/latest-dashboard`);
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.dashboard_data) {
          setData(payload.dashboard_data);
          setRawResponse(payload.raw_response || null);
          setLlmRequestContent(payload.llm_request || null);
          setDevStats(payload.token_stats || null);
          if (payload.provider) {
            setProvider(payload.provider);
          }
          setStatus('Loaded last saved dashboard.');
          addProgress('Loaded last saved dashboard from disk.');
        }
      } catch (err) {
        console.warn('No saved dashboard available on startup.', err);
      }
    };

    fetchProviders();
    loadLatestDashboard();
  }, []);

  const cancelDashboardRequest = async () => {
    if (!abortController) {
      return;
    }

    abortController.abort();
    setLoading(false);
    setStatus('Request canceled by user.');
    setError(null);
    setAbortController(null);
    addProgress('User canceled the active request.');

    try {
      await fetch(`${API_BASE_URL}/api/cancel-dashboard`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('Cancel endpoint did not respond cleanly.', err);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setRawResponse(null);
    setLlmRequestContent(null);
    setDevStats(null);
    setProgressLog([]);
    setStatus('Initializing agent...');
    const requestPayloadJson = { provider };
    const requestPayload = JSON.stringify(requestPayloadJson, null, 2);
    const backendRequest = [
      `POST ${API_BASE_URL}/api/stream-dashboard`,
      `Headers: ${JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)}`,
      `Body: ${requestPayload}`
    ].join('\n\n');
    setRequestContent(backendRequest);
    addProgress(`Request started for provider ${provider}`);
    addProgress(`Backend request details recorded.`);
    
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${API_BASE_URL}/api/stream-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestPayload,
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Failed to connect to agent stream.');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('Stream reader not available.');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '');
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.message) {
                setStatus(payload.message);
                addProgress(payload.message);
              }

              if (payload.llm_request) {
                setLlmRequestContent(payload.llm_request);
                addProgress('Received LLM request content.');
              }

              if (payload.token_stats) {
                setDevStats(payload.token_stats);
                addProgress('Received token usage stats.');
              }

              if (payload.status === 'analysis_complete') {
                setData(payload.data);
                if (payload.raw_response) {
                  setRawResponse(payload.raw_response);
                }
                if (payload.token_stats) {
                  setDevStats(payload.token_stats);
                }
                setLoading(false);
              } else if (payload.status === 'error') {
                setError(payload.message);
                setLoading(false);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        setStatus('Request canceled by user.');
        setError(null);
        setRawResponse('Request canceled by user.');
      } else {
        setError(err.message || 'Failed to fetch dashboard data. Make sure the backend is running.');
      }
      setLoading(false);
    } finally {
      setAbortController(null);
    }
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text }}>
      <style>{`
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .pulse { animation: pulse-red 2s ease-in-out infinite; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* TOP BAR */}
      <div style={{
        background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
        padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
            letterSpacing: "0.1em", color: COLORS.amber
          }}>MACRO · CREDIT · RISK</div>
          <div style={{ width: 1, height: 20, background: COLORS.border }} />
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.muted }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase()}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: data.risk.score >= 7 ? COLORS.red : COLORS.green }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: data.risk.score >= 7 ? COLORS.red : COLORS.green, letterSpacing: "0.1em" }}>
                {data.risk.score >= 7 ? 'HIGH SYSTEMIC STRESS' : 'STABLE MARKET REGIME'}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
            <Settings size={14} className="text-slate-400" />
            <select 
              className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer border-none"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={loading}
            >
              {providers.map((p) => (
                <option key={p} value={p} className="bg-slate-900">
                  {p === 'Ollama' ? 'Ollama (Gemma 4)' : 
                   p === 'Gemini' ? 'Gemini 1.5 Flash' : 
                   p === 'Claude' ? 'Claude 4.6 Sonnet' : 
                   p === 'Nvidia' ? 'NVIDIA (Qwen 2.5)' : 
                   p === 'Bytedance' ? 'Bytedance (Seed OSS)' : p}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={loading ? cancelDashboardRequest : fetchDashboard}
            style={{
              background: loading ? COLORS.red : COLORS.amber, color: "#000", padding: "6px 16px",
              borderRadius: "20px", fontWeight: "bold", fontSize: "12px",
              cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {loading ? 'STOP' : data ? 'REFRESH' : 'GENERATE'}
          </button>
        </div>
      </div>

      <main style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-40 text-center opacity-70">
            <div className="bg-slate-800 p-8 rounded-full mb-6">
              <RefreshCw size={64} className="text-slate-600" />
            </div>
            <h2 className="text-3xl font-bold mb-2">System Ready</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Initiate agentic research to compile real-time macro-economic intelligence.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-40 text-center fade-in">
            <Loader2 size={48} className="animate-spin text-amber-500 mb-4" />
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: "0.05em" }} className="mb-1">{status}</h2>
            <p className="text-slate-500 text-sm animate-pulse font-mono">SCANNING GLOBAL DATA SOURCES...</p>
          </div>
        )}

        {error && (
          <Card style={{ maxWidth: 600, margin: "40px auto", textAlign: "center", border: `1px solid ${COLORS.red}44` }}>
            <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: COLORS.red }}>Analysis Failed</h2>
            <p className="text-slate-400 text-sm mb-6 font-mono">{error}</p>
            <button 
              onClick={fetchDashboard}
              style={{ background: COLORS.red, color: "#fff", padding: "8px 24px", borderRadius: "20px", border: "none", fontWeight: "bold", cursor: "pointer" }}
            >
              RETRY SYSTEM
            </button>
          </Card>
        )}

        {data && !loading && (
          <div className="fade-in">
            {/* KPI STRIP */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
              gap: 1, background: COLORS.border, borderRadius: 8, overflow: "hidden",
              marginBottom: 24, border: `1px solid ${COLORS.border}`
            }}>
              <div style={{ background: COLORS.surface, padding: "18px 24px" }}>
                <MetricBig label="Risk Sentiment" value={data.risk.score} unit="/10" color={data.risk.score >= 7 ? COLORS.red : COLORS.amber} sub={data.risk.summary} />
              </div>
              <div style={{ background: COLORS.surface, padding: "18px 24px" }}>
                <MetricBig label="Avg Mid-Cap ICR" value={data.credit.mid_cap_avg_icr.toFixed(2)} unit="x" color={data.credit.mid_cap_avg_icr < 1.5 ? COLORS.red : COLORS.green} sub={`Alert: ${data.credit.alert ? 'YES' : 'NO'}`} />
              </div>
              <div style={{ background: COLORS.surface, padding: "18px 24px" }}>
                <MetricBig label="PIK Issuance" value={data.credit.pik_debt_issuance} color={COLORS.orange} sub="Deferred interest volume" />
              </div>
              <div style={{ background: COLORS.surface, padding: "18px 24px" }}>
                <MetricBig label="CRE Delinquency" value={data.credit.cre_delinquency_rate} color={COLORS.red} sub="Commercial Real Estate stress" />
              </div>
              <div style={{
                background: COLORS.surface, padding: "18px 24px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
              }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Systemic Risk</div>
                <RiskGauge data={data.risk} />
              </div>
            </div>

            {/* MAIN GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, marginBottom: 16 }}>
              <Calendar data={data.calendar} />
              <CreditPanel data={data.credit} />
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, width: "100%", overflow: "hidden" }}>
              <div style={{ minWidth: 0 }}>
                <EventsFeed events={data.events} />
              </div>
              
              <div style={{ minWidth: 0 }}>
                <Card>
                  <SectionTitle>Safe-Haven & Technicals</SectionTitle>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.amber, letterSpacing: "0.1em" }}>CONTAGION ANALYSIS</span>
                      <Shield size={14} color={COLORS.amber} />
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
                      {data.risk.contagion_analysis}
                    </p>
                  </div>
                  <div style={{ height: 1, background: COLORS.border, margin: "14px 0" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.muted, textTransform: "uppercase", flex: 1, wordBreak: "break-word", lineHeight: 1.4 }}>Gold Technicals</span>
                      <Tag color={COLORS.amber} style={{ flexShrink: 0 }}>{data.risk.gold_technical || 'N/A'}</Tag>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.muted, textTransform: "uppercase", flex: 1, wordBreak: "break-word", lineHeight: 1.4 }}>USD Strength</span>
                      <Tag color={COLORS.cyan} style={{ flexShrink: 0 }}>{data.risk.usd_technical || 'N/A'}</Tag>
                    </div>
                  </div>
                </Card>
              </div>

              <div style={{ minWidth: 0 }}>
                <PortfolioAdvice suggestions={data.portfolio_suggestions} risks={data.risk_mitigation_steps} />
              </div>
            </div>

            <footer className="text-center pt-12 pb-12 text-slate-600 text-[9px] uppercase tracking-[0.3em] font-mono">
              Agentic Intelligence Terminal • LangGraph Workflows • v4.0 Professional
            </footer>
          </div>
        )}

        {(loading || data || error) && (
          <details open style={{ marginTop: 24, border: `1px solid ${COLORS.border}`, borderRadius: 12, background: COLORS.surface, padding: 20 }}>
            <summary style={{ cursor: 'pointer', fontWeight: '700', color: COLORS.amber, fontSize: 14, marginBottom: 12 }}>Process details and raw LLM response</summary>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Progress log</div>
                <div style={{ padding: 14, background: '#0f1722', borderRadius: 10, minHeight: 120, overflowY: 'auto', maxHeight: 240, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#cbd5e1' }}>
                  {progressLog.length > 0 ? (
                    progressLog.map((entry, index) => (
                      <div key={index} style={{ marginBottom: 6 }}>{entry}</div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.7 }}>No progress events yet.</div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Backend request details</div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 14, background: '#0f1722', borderRadius: 10, minHeight: 120, overflowX: 'auto', maxHeight: 220, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#cbd5e1' }}>
                  {requestContent || 'No request content available.'}
                </pre>
              </div>

              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>LLM request content</div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 14, background: '#0f1722', borderRadius: 10, minHeight: 120, overflowX: 'auto', maxHeight: 220, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#cbd5e1' }}>
                  {llmRequestContent || 'Waiting for the LLM request to be built...'}
                </pre>
              </div>

              <div>
                <details style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, background: '#020917' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700, color: COLORS.amber, fontSize: 12 }}>Dev Stats</summary>
                  <div style={{ marginTop: 10, display: 'grid', gap: 8, fontFamily: 'DM Mono, monospace', color: '#cbd5e1', fontSize: 12 }}>
                    <div>Request tokens: {devStats?.request_tokens ?? 'N/A'}</div>
                    <div>Response tokens: {devStats?.response_tokens ?? 'N/A'}</div>
                    <div>Total tokens: {devStats?.total_tokens ?? 'N/A'}</div>
                  </div>
                </details>
              </div>

              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>Full raw response</div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: 14, background: '#0f1722', borderRadius: 10, minHeight: 160, overflowX: 'auto', maxHeight: 320, fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#cbd5e1' }}>
                  {rawResponse || 'Waiting for the LLM response to arrive...'}
                </pre>
              </div>
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

export default App;
