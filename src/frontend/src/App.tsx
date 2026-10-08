import { AlertTriangle, Loader2, RefreshCw, Settings, Check, X, Terminal, Activity, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Calendar } from './components/Calendar';
import { CreditPanel } from './components/CreditPanel';
import { MacroIndicators } from './components/MacroIndicators';
import { ExecutiveSummaryPanel } from './components/ExecutiveSummaryPanel';
import { MacroCorrelationsPanel } from './components/MacroCorrelationsPanel';
import { HistoricalComparisonSidebar } from './components/HistoricalComparisonSidebar';
import { TopIntelligenceBar } from './components/TopIntelligenceBar';
import { EventsFeed } from './components/EventsFeed';
import { PortfolioAdvice } from './components/PortfolioAdvice';
import { RiskGauge } from './components/RiskGauge';
import { SafeHavenTechnicals } from './components/SafeHavenTechnicals';
import { Card, MetricBig } from './components/UIAtoms';
import { useDashboardStore } from './store/useDashboardStore';
import { COLORS } from './theme';

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
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
    bootstrap,
  } = useDashboardStore();

  console.log('[App] Render State:', { loading, hasData: !!data, hasError: !!error, status });

  const [showSystemicTooltip, setShowSystemicTooltip] = useState(false);

  useEffect(() => {
    document.title = 'MacroDashboard by SaudAziz';
    void bootstrap();
  }, [bootstrap]);

  const riskScore = toFiniteNumber(data?.risk?.score, 0);
  const avgMidCapIcr = toFiniteNumber(data?.credit?.mid_cap_avg_icr, 0);
  const unrateValue = toFiniteNumber(
    parseFloat(String(data?.macro_indicators?.unemployment_rate?.value || '').replace(/[^0-9.]/g, '')),
    4.2
  );
  const spread10Y2YValue = toFiniteNumber(
    parseFloat(String(data?.macro_indicators?.yield_curve_2y_10y?.value || data?.correlations?.spread_10y_2y || '').replace(/[^\d.-]/g, '')),
    0.48
  );
  const vixValue = toFiniteNumber(
    parseFloat(String(data?.correlations?.vix || (Array.isArray(data?.correlations?.historical_points) && data.correlations.historical_points.slice(-1)[0]?.vix) || '').replace(/[^0-9.]/g, '')),
    15.52
  );
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
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="font-['Bebas_Neue'] text-xl tracking-[0.1em] text-amber-500 flex items-center gap-2">
              <span>MACRO - CREDIT - RISK</span>
              <span className="font-mono text-[10px] text-slate-400 font-semibold tracking-wider uppercase">by Saud Aziz</span>
            </div>
            <div className="h-5 w-px bg-slate-700" />
            <div className="font-mono text-[11px] text-slate-400">
              {new Date()
                .toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                .toUpperCase()}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(data || (loading && agentTrace.length > 0)) && (
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full animate-pulse ${riskScore >= 7 ? 'bg-red-500' : 'bg-emerald-500'}`}
                />
                <span className={`font-mono text-[11px] tracking-[0.1em] ${riskScore >= 7 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {riskScore >= 7 ? 'HIGH SYSTEMIC STRESS' : 'STABLE MARKET REGIME'}
                </span>
              </div>
            )}

            <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm" htmlFor="provider-select">
              <Settings size={14} className="text-slate-400" />
              <span className="sr-only">Model provider</span>
              <select
                id="provider-select"
                aria-label="Provider"
                className="cursor-pointer border-none bg-transparent text-sm outline-none"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={loading}
              >
                {providers.map((item) => (
                  <option key={item} value={item} className="bg-slate-900">
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 font-mono text-[11px] text-slate-400">
              <input
                type="checkbox"
                id="skip-cache"
                checked={skipCache}
                onChange={(e) => setSkipCache(e.target.checked)}
                disabled={loading}
                className="h-3.5 w-3.5 cursor-pointer"
              />
              Fresh Data
            </label>

            <button
              onClick={() => {
                void (loading ? cancelDashboardRequest() : fetchDashboard());
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-black ${
                loading ? 'bg-red-500' : 'bg-amber-500'
              }`}
              aria-label={loading ? 'Cancel dashboard generation' : 'Generate dashboard'}
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              {loading ? 'STOP' : data ? 'REFRESH' : 'GENERATE'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8" aria-live="polite">
        {!data && !loading && !error && (
          <section className="flex flex-col items-center justify-center py-24 text-center opacity-80 md:py-40">
            <div className="mb-6 rounded-full bg-slate-800 p-8">
              <RefreshCw size={64} className="text-slate-600" />
            </div>
            <h2 className="mb-2 text-3xl font-bold">System Ready</h2>
            <p className="mx-auto max-w-md text-slate-400">Initiate agentic research to compile real-time macro-economic intelligence.</p>
          </section>
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
          <Card className="mx-auto my-10 max-w-xl text-center" style={{ border: `1px solid ${COLORS.red}44` }}>
            <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="font-['Bebas_Neue'] text-3xl text-red-500">Analysis Failed</h2>
            <p className="mb-6 text-sm text-slate-400">{error}</p>
            <button
              onClick={() => {
                void fetchDashboard();
              }}
              className="rounded-full bg-red-500 px-6 py-2 text-sm font-bold text-white"
            >
              RETRY SYSTEM
            </button>
          </Card>
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

            {/* Top Row: Regime Probability Gauge & 'What Changed Yesterday?' Strip */}
            <TopIntelligenceBar
              riskScore={riskScore}
              spread10Y2Y={spread10Y2YValue}
              icr={avgMidCapIcr}
              vix={vixValue}
              unrate={unrateValue}
              data={data}
            />

            {/* Core Panels Row: Executive Summary (Left) + Core Key Gauges (Right) */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
              <ExecutiveSummaryPanel
                data={data?.executive_summary}
                riskScore={riskScore}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800">
                {/* Left Side: Systemic Stress Risk Gauge with Context & Interpretation Guide */}
                <div className="bg-[#0d1420] p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Activity size={14} className="text-amber-400" />
                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                          Systemic Stress Risk Gauge
                        </span>
                      </div>
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setShowSystemicTooltip(!showSystemicTooltip)}
                          onMouseEnter={() => setShowSystemicTooltip(true)}
                          onMouseLeave={() => setShowSystemicTooltip(false)}
                          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded cursor-pointer"
                          aria-label="Explain Systemic Stress Risk Gauge"
                        >
                          <Info size={13} />
                        </button>
                        {showSystemicTooltip && (
                          <div className="absolute right-0 top-6 z-50 w-72 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
                            <p className="font-semibold text-amber-400 mb-1">Why Track Systemic Stress:</p>
                            <p className="text-slate-300 leading-relaxed">
                              Synthesizes cross-market liquidity, interbank funding spreads, corporate credit default spreads, and leverage to provide an immediate early-warning thermometer of systemic freeze.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gauge Visual */}
                    <div className="py-2 flex flex-col items-center justify-center">
                      <RiskGauge data={data?.risk || { score: riskScore, summary: '' }} />
                      <div className="text-center mt-1">
                        <span className="font-mono text-xs text-slate-300 font-semibold">
                          {data?.risk?.summary ?? 'Moderate systemic financial strain'}
                        </span>
                      </div>
                    </div>

                    {/* Educational Guide: What It Means & How to Read the Score */}
                    <div className="mt-2 space-y-2 rounded-lg bg-slate-950/70 p-2.5 border border-slate-800/80 text-[11px]">
                      <div>
                        <p className="font-bold text-amber-400 text-[10px] uppercase font-mono tracking-wider">
                          Why We Track This Gauge:
                        </p>
                        <p className="text-slate-300 leading-relaxed mt-0.5 text-[11px]">
                          While the Regime Gauge predicts forward 6–12 mo cycle odds, this gauge acts as an immediate <strong>liquidity and solvency thermometer</strong> across credit spreads, corporate leverage, and interbank funding.
                        </p>
                      </div>

                      <div className="pt-1.5 border-t border-slate-800">
                        <p className="font-bold text-slate-300 text-[10px] uppercase font-mono tracking-wider mb-1">
                          How to Make Sense of the Reading:
                        </p>
                        <div className="space-y-1 text-[10px] font-mono">
                          <div className="flex items-center justify-between text-emerald-400/90">
                            <span>• 1.0 – 3.9: Calm / Stable</span>
                            <span className="text-slate-500 font-sans">Ample liquidity</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20 font-bold">
                            <span>• 4.0 – 6.9: Moderate / Watch (Current: {riskScore.toFixed(1)})</span>
                            <span className="text-amber-300 font-sans">Restricted credit</span>
                          </div>
                          <div className="flex items-center justify-between text-rose-400/90">
                            <span>• 7.0 – 10.0: High / Crisis</span>
                            <span className="text-slate-500 font-sans">Liquidity freeze</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/60">
                    Synthesizes ICR ({avgMidCapIcr.toFixed(2)}x), PIK debt, CRE risk & credit OAS.
                  </div>
                </div>

                {/* Right Side: Credit Vulnerability Stack (Avg Mid-Cap ICR -> PIK Issuance -> CRE Delinquency) */}
                <div className="flex flex-col gap-px bg-slate-800">
                  {/* 1. Avg Mid-Cap ICR */}
                  <div className="bg-[#0d1420] p-4 flex-1">
                    <MetricBig
                      label="Avg Mid-Cap ICR"
                      value={avgMidCapIcr.toFixed(2)}
                      unit="x"
                      color={avgMidCapIcr < 1.5 ? COLORS.red : COLORS.green}
                      sub={`Alert: ${data?.credit?.alert ? 'YES' : 'NO'}`}
                      helpText="Interest Coverage Ratio (ICR) measures how easily companies can pay debt interest from operating earnings. Above 2.0x is healthy; below 1.5x signals high default risk."
                    />
                  </div>

                  {/* 2. PIK Issuance (placed directly under ICR) */}
                  <div className="bg-[#0d1420] p-4 flex-1">
                    <MetricBig
                      label="PIK Issuance"
                      value={data?.credit?.pik_debt_issuance ?? 'N/A'}
                      color={COLORS.orange}
                      sub="Deferred interest volume"
                      helpText="Payment-In-Kind (PIK) debt activity. Companies pay interest with more debt instead of cash. Rising PIK indicates cash flow strain."
                    />
                  </div>

                  {/* 3. CRE Delinquency (placed directly under PIK) */}
                  <div className="bg-[#0d1420] p-4 flex-1">
                    <MetricBig
                      label="CRE Delinquency"
                      value={data?.credit?.cre_delinquency_rate ?? 'N/A'}
                      color={COLORS.red}
                      sub="Commercial Real Estate stress"
                      helpText="Commercial Real Estate (CRE) delinquency trend. Rising default rates signal broader property and regional banking credit weakness."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Macro Correlations & 5-Year Historical Trends with 3-Recession Sidebar */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
              <MacroCorrelationsPanel data={data?.correlations} />
              <HistoricalComparisonSidebar />
            </div>

            {data?.macro_indicators && (
              <MacroIndicators data={data.macro_indicators} />
            )}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
              <Calendar data={data?.calendar || { dates: [], rates: [] }} />
              <CreditPanel data={data?.credit || { mid_cap_avg_icr: 0, sectoral_breakdown: [], pik_debt_issuance: 'N/A', cre_delinquency_rate: 'N/A', mid_cap_hy_oas: 'N/A', cp_spreads: 'N/A', vix_of_credit_cdx: 'N/A', watchlist: [], alert: false }} />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="min-w-0">
                <EventsFeed events={events} />
              </div>
              <SafeHavenTechnicals risk={data?.risk} crypto={data?.crypto_contagion} />
              <div className="min-w-0">
                <PortfolioAdvice suggestions={suggestions} risks={mitigationSteps} />
              </div>
            </div>

            <footer className="pb-8 pt-10 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-slate-500">
              Agentic Intelligence Terminal <span className="text-amber-400 font-bold">by Saud Aziz</span> — Agent-UI Protocol — v5.0 Intro
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
              {/* --- INTERRUPT HANDLING --- */}
              {interrupt && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="mb-3 flex items-center gap-2 text-red-500">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Human Intervention Required</span>
                  </div>
                  <p className="mb-4 text-sm text-slate-300">
                    <span className="font-bold text-red-400">[{interrupt.agent}]</span>: {interrupt.message}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => void handleInterrupt('approved')}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      PROCEED
                    </button>
                    <button
                      onClick={() => void handleInterrupt('rejected')}
                      className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
                    >
                      TERMINATE
                    </button>
                  </div>
                </div>
              )}

              {reasoning && (
                <section>
                  <h3 className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">Strategic Thinking Process</h3>
                  <div className="max-h-60 overflow-y-auto rounded-xl bg-black/40 p-4 font-mono text-xs text-blue-300/80 leading-relaxed scrollbar-thin scrollbar-thumb-white/10 whitespace-pre-wrap">
                    {reasoning}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">System Progress log</h3>
                <div className="max-h-60 min-h-28 overflow-y-auto rounded-xl bg-black/40 p-4 font-mono text-xs text-slate-300 scrollbar-thin scrollbar-thumb-white/10">
                  {progressLog.length > 0 ? (
                    progressLog.map((entry, index) => (
                      <div key={index} className="mb-1.5 border-b border-slate-800/50 pb-1 last:border-0">
                        {entry}
                      </div>
                    ))
                  ) : (
                    <div className="opacity-70">No progress events yet.</div>
                  )}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section>
                  <h3 className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">Backend request details</h3>
                  <pre className="max-h-56 min-h-28 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/40 p-4 font-mono text-[11px] text-slate-300 scrollbar-thin scrollbar-thumb-white/10">   
                    {requestContent || 'No request content available.'}
                  </pre>
                </section>

                <section>
                  <h3 className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">LLM prompt structure</h3>
                  <pre className="max-h-56 min-h-28 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/40 p-4 font-mono text-[11px] text-slate-300 scrollbar-thin scrollbar-thumb-white/10">   
                    {llmRequestContent || 'Waiting for the LLM request to be built...'}
                  </pre>
                </section>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Request Tokens:</span>
                  <span className="font-mono text-xs text-amber-500">{devStats?.request_tokens ?? 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Response Tokens:</span>
                  <span className="font-mono text-xs text-amber-500">{devStats?.response_tokens ?? 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Total:</span>
                  <span className="font-mono text-xs text-amber-500">{devStats?.total_tokens ?? 'N/A'}</span>
                </div>
              </div>

              <section>
                <h3 className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">Full raw agent output</h3>
                <pre className="max-h-80 min-h-40 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/40 p-4 font-mono text-[11px] text-slate-300 scrollbar-thin scrollbar-thumb-white/10">   
                  {rawResponse || 'Waiting for final response...'}
                </pre>
              </section>
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

export default App;
