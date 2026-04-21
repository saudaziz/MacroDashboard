import { AlertTriangle, Loader2, RefreshCw, Settings, Shield, Check, X, Terminal } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { CreditPanel } from './components/CreditPanel';
import { EventsFeed } from './components/EventsFeed';
import { PortfolioAdvice } from './components/PortfolioAdvice';
import { RiskGauge } from './components/RiskGauge';
import { Card, MetricBig, SectionTitle, Tag } from './components/UIAtoms';
import { useDashboard } from './hooks/useDashboard';
import { COLORS } from './theme';

const toFiniteNumber = (value: unknown, fallback = 0): number => {
// ... (keep toFiniteNumber) ...
};

function App() {
  const {
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
  } = useDashboard();

  const riskScore = toFiniteNumber(data?.risk?.score, 0);
  const avgMidCapIcr = toFiniteNumber(data?.credit?.mid_cap_avg_icr, 0);
  const events = Array.isArray(data?.events) ? data.events : [];
  const suggestions = Array.isArray(data?.portfolio_suggestions) ? data.portfolio_suggestions : [];
  const mitigationSteps = Array.isArray(data?.risk_mitigation_steps) ? data.risk_mitigation_steps.map((step) => String(step)) : [];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200">
      {/* --- HITL INTERRUPT OVERLAY --- */}
      {interrupt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <Card className="mx-4 max-w-md border-amber-500/50 bg-[#0d1420] p-8 shadow-2xl shadow-amber-500/10">
            <div className="mb-4 flex items-center gap-3 text-amber-500">
              <AlertTriangle size={24} />
              <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider">Human Intervention Required</h2>
            </div>
            <div className="mb-2 font-mono text-[10px] text-slate-500 uppercase">Agent: {interrupt.agent}</div>
            <p className="mb-6 text-sm leading-relaxed text-slate-300">{interrupt.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleInterrupt('approved')}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
              >
                <Check size={18} />
                APPROVE
              </button>
              <button
                onClick={() => handleInterrupt('rejected')}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-red-500"
              >
                <X size={18} />
                REJECT
              </button>
            </div>
          </Card>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0d1420] px-4 py-3 md:px-8">
{/* ... (keep header contents) ... */}
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8" aria-live="polite">
        {!data && !loading && !error && (
{/* ... (keep empty state) ... */}
        )}

        {loading && (
          <section className="flex flex-col items-center justify-center py-24 text-center md:py-40" aria-label="Loading state">
            <div className="relative mb-8">
               <Loader2 size={64} className="animate-spin text-amber-500" />
               {activeAgent && (
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-black shadow-lg">
                   ACTIVE: {activeAgent.toUpperCase()}
                 </div>
               )}
            </div>
            <h2 className="mb-1 font-['Bebas_Neue'] text-[32px] tracking-[0.05em]">{status}</h2>
            <p className="animate-pulse font-mono text-sm text-slate-500">AGENTIC WORKFLOW IN PROGRESS...</p>
          </section>
        )}

        {error && (
{/* ... (keep error state) ... */}
        )}

        {(data || (loading && agentTrace.length > 0)) && (
          <section className="space-y-4">
            {/* Spotlight Banner during loading */}
            {loading && activeAgent && (
               <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2">
                 <div className="flex items-center gap-3">
                   <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                   <span className="font-mono text-[11px] text-amber-400 uppercase tracking-widest">
                     Live Agent Trace: {activeAgent} is processing...
                   </span>
                 </div>
                 <span className="font-mono text-[10px] text-slate-500 italic">Progressive data rendering enabled</span>
               </div>
            )}

            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
{/* ... (keep metrics grid) ... */}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
              <Calendar data={data?.calendar || { dates: [], rates: [] }} />
              <CreditPanel data={data?.credit || { mid_cap_avg_icr: 0, sectoral_breakdown: [], pik_debt_issuance: 'N/A', cre_delinquency_rate: 'N/A', mid_cap_hy_oas: 'N/A', cp_spreads: 'N/A', vix_of_credit_cdx: 'N/A', watchlist: [], alert: false }} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="min-w-0">
                <EventsFeed events={events} />
              </div>
              <Card className="min-w-0 overflow-hidden">
                <SectionTitle>Safe-Haven & Technicals</SectionTitle>
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.1em] text-amber-500">CONTAGION ANALYSIS</span>
                    <Shield size={14} color={COLORS.amber} />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-400">{data?.risk?.contagion_analysis ?? 'Waiting for analysis...'}</p>
                </div>
                <div className="my-3.5 h-px bg-slate-800" />
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase leading-relaxed text-slate-500">Gold Technicals</span>
                    <Tag color={COLORS.amber} style={{ whiteSpace: 'normal', maxWidth: '100%', width: '100%', lineHeight: 1.45, fontSize: 12 }}>
                      {data?.risk?.gold_technical || 'N/A'}
                    </Tag>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase leading-relaxed text-slate-500">USD Strength</span>
                    <Tag color={COLORS.cyan} style={{ whiteSpace: 'normal', maxWidth: '100%', width: '100%', lineHeight: 1.45, fontSize: 12 }}>
                      {data?.risk?.usd_technical || 'N/A'}
                    </Tag>
                  </div>
                </div>
              </Card>
              <div className="min-w-0">
                <PortfolioAdvice suggestions={suggestions} risks={mitigationSteps} />
              </div>
            </div>

            <footer className="pb-8 pt-10 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-slate-600">
              Agentic Intelligence Terminal - Agent-UI Protocol - v5.0 Intro
            </footer>
          </section>
        )}

        {(loading || data || error || reasoning || agentTrace.length > 0) && (
          <details
            open
            className="mt-6 rounded-xl border border-slate-800 bg-[#0d1420] p-5"
            aria-label="Process details and raw LLM response"
          >
            <summary className="mb-3 cursor-pointer text-sm font-bold text-amber-500">Process details and agent logs</summary>
            <div className="grid gap-4">
              {/* --- AGENT TRACE LOGS --- */}
              {agentTrace.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Terminal size={14} className="text-slate-500" />
                    <h3 className="text-xs text-slate-500 uppercase tracking-wider font-bold">Multi-Agent Debate Trace</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-black/40 p-4 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                    {agentTrace.map((entry, idx) => (
                      <div key={idx} className="mb-3 border-l-2 border-slate-800 pl-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-bold text-amber-500">{entry.agent}</span>
                          <span className="text-[9px] text-slate-600">{entry.timestamp}</span>
                        </div>
                        <div className="text-slate-400 whitespace-pre-wrap">{entry.message}</div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex items-center gap-2 text-amber-500/50 italic">
                        <Loader2 size={10} className="animate-spin" />
                        Listening for next agent event...
                      </div>
                    )}
                  </div>
                </section>
              )}
{/* ... (rest of details) ... */}
