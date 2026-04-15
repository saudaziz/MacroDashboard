import { useState } from 'react';
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
  const [provider, setProvider] = useState('Ollama');
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setStatus('Initializing agent...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/stream-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
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
              if (payload.status === 'research_start' || payload.status === 'research_complete' || payload.status === 'analysis_start') {
                setStatus(payload.message);
              } else if (payload.status === 'analysis_complete') {
                setData(payload.data);
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
      setError(err.message || 'Failed to fetch dashboard data. Make sure the backend is running.');
      setLoading(false);
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
              <option value="Ollama" className="bg-slate-900">Ollama (Gemma 2)</option>
              <option value="Gemini" className="bg-slate-900">Gemini 2.0 Flash</option>
              <option value="Claude" className="bg-slate-900">Claude 3.5 Sonnet</option>
            </select>
          </div>
          
          <button 
            onClick={fetchDashboard}
            disabled={loading}
            style={{
              background: COLORS.amber, color: "#000", padding: "6px 16px",
              borderRadius: "20px", fontWeight: "bold", fontSize: "12px",
              cursor: "pointer", border: "none", display: "flex", alignItems: "center", gap: "8px"
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            {data ? 'REFRESH' : 'GENERATE'}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <EventsFeed events={data.events} />
              
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
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Gold Technicals</span>
                    <Tag color={COLORS.amber}>{data.risk.gold_technical || 'N/A'}</Tag>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">USD Strength</span>
                    <Tag color={COLORS.cyan}>{data.risk.usd_technical || 'N/A'}</Tag>
                  </div>
                </div>
              </Card>

              <PortfolioAdvice suggestions={data.portfolio_suggestions} risks={data.risk_mitigation_steps} />
            </div>

            <footer className="text-center pt-12 pb-12 text-slate-600 text-[9px] uppercase tracking-[0.3em] font-mono">
              Agentic Intelligence Terminal • LangGraph Workflows • v4.0 Professional
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
