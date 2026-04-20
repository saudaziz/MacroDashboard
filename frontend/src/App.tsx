import { AlertTriangle, Loader2, RefreshCw, Settings, Shield } from 'lucide-react';
import { Calendar } from './components/Calendar';
import { CreditPanel } from './components/CreditPanel';
import { EventsFeed } from './components/EventsFeed';
import { PortfolioAdvice } from './components/PortfolioAdvice';
import { RiskGauge } from './components/RiskGauge';
import { Card, MetricBig, SectionTitle, Tag } from './components/UIAtoms';
import { useDashboard } from './hooks/useDashboard';
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
    setProvider,
    setSkipCache,
    fetchDashboard,
    cancelDashboardRequest,
  } = useDashboard();

  const riskScore = toFiniteNumber(data?.risk?.score, 0);
  const avgMidCapIcr = toFiniteNumber(data?.credit?.mid_cap_avg_icr, 0);
  const events = Array.isArray(data?.events) ? data.events : [];
  const suggestions = Array.isArray(data?.portfolio_suggestions) ? data.portfolio_suggestions : [];
  const mitigationSteps = Array.isArray(data?.risk_mitigation_steps) ? data.risk_mitigation_steps.map((step) => String(step)) : [];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-200">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0d1420] px-4 py-3 md:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="font-['Bebas_Neue'] text-xl tracking-[0.1em] text-amber-500">MACRO - CREDIT - RISK</div>
            <div className="h-5 w-px bg-slate-700" />
            <div className="font-mono text-[11px] text-slate-400">
              {new Date()
                .toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                .toUpperCase()}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data && (
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
            <Loader2 size={48} className="mb-4 animate-spin text-amber-500" />
            <h2 className="mb-1 font-['Bebas_Neue'] text-[32px] tracking-[0.05em]">{status}</h2>
            <p className="animate-pulse font-mono text-sm text-slate-500">SCANNING GLOBAL DATA SOURCES...</p>
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

        {data && !loading && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <div className="bg-[#0d1420] p-4 md:p-5">
                <MetricBig
                  label="Risk Sentiment"
                  value={riskScore}
                  unit="/10"
                  color={riskScore >= 7 ? COLORS.red : COLORS.amber}
                  sub={data.risk.summary}
                  helpText="Overall market risk level from 0-10. Higher values indicate elevated stress and tighter financial conditions."
                />
              </div>
              <div className="bg-[#0d1420] p-4 md:p-5">
                <MetricBig
                  label="Avg Mid-Cap ICR"
                  value={avgMidCapIcr.toFixed(2)}
                  unit="x"
                  color={avgMidCapIcr < 1.5 ? COLORS.red : COLORS.green}
                  sub={`Alert: ${data.credit.alert ? 'YES' : 'NO'}`}
                  helpText="Interest Coverage Ratio. Below ~1.5x suggests higher debt-servicing pressure."
                />
              </div>
              <div className="bg-[#0d1420] p-4 md:p-5">
                <MetricBig
                  label="PIK Issuance"
                  value={data.credit.pik_debt_issuance}
                  color={COLORS.orange}
                  sub="Deferred interest volume"
                  helpText="Payment-In-Kind debt activity. Higher levels can indicate refinancing stress."
                />
              </div>
              <div className="bg-[#0d1420] p-4 md:p-5">
                <MetricBig
                  label="CRE Delinquency"
                  value={data.credit.cre_delinquency_rate}
                  color={COLORS.red}
                  sub="Commercial Real Estate stress"
                  helpText="Commercial Real Estate delinquency trend. Rising rates can signal broader credit weakness."
                />
              </div>
              <div className="flex flex-col items-center justify-center bg-[#0d1420] p-4 md:p-5">
                <div
                  className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"
                  title="Composite stress indicator derived from macro, risk, and credit signals."
                  aria-label="Composite stress indicator derived from macro, risk, and credit signals."
                >
                  Systemic Risk
                </div>
                <RiskGauge data={data.risk} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.2fr]">
              <Calendar data={data.calendar} />
              <CreditPanel data={data.credit} />
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
                  <p className="text-xs leading-relaxed text-slate-400">{data.risk.contagion_analysis ?? 'N/A'}</p>
                </div>
                <div className="my-3.5 h-px bg-slate-800" />
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase leading-relaxed text-slate-500">Gold Technicals</span>
                    <Tag color={COLORS.amber} style={{ whiteSpace: 'normal', maxWidth: '100%', width: '100%', lineHeight: 1.45, fontSize: 12 }}>
                      {data.risk.gold_technical || 'N/A'}
                    </Tag>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-[10px] uppercase leading-relaxed text-slate-500">USD Strength</span>
                    <Tag color={COLORS.cyan} style={{ whiteSpace: 'normal', maxWidth: '100%', width: '100%', lineHeight: 1.45, fontSize: 12 }}>
                      {data.risk.usd_technical || 'N/A'}
                    </Tag>
                  </div>
                </div>
              </Card>
              <div className="min-w-0">
                <PortfolioAdvice suggestions={suggestions} risks={mitigationSteps} />
              </div>
            </div>

            <footer className="pb-8 pt-10 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-slate-600">
              Agentic Intelligence Terminal - LangGraph Workflows - v4.0 Professional
            </footer>
          </section>
        )}

        {(loading || data || error || reasoning) && (
          <details
            open
            className="mt-6 rounded-xl border border-slate-800 bg-[#0d1420] p-5"
            aria-label="Process details and raw LLM response"
          >
            <summary className="mb-3 cursor-pointer text-sm font-bold text-amber-500">Process details and raw LLM response</summary>
            <div className="grid gap-4">
              {reasoning && (
                <section>
                  <h3 className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">Thinking Process</h3>
                  <div className="max-h-60 overflow-y-auto rounded-xl bg-[#0f1722] p-3.5 font-mono text-xs text-blue-300/80 leading-relaxed scrollbar-thin scrollbar-thumb-white/10 whitespace-pre-wrap">
                    {reasoning}
                  </div>
                </section>
              )}
              <section>
                <h3 className="mb-2 text-xs text-slate-500">Progress log</h3>
                <div className="max-h-60 min-h-28 overflow-y-auto rounded-xl bg-[#0f1722] p-3.5 font-mono text-xs text-slate-300">
                  {progressLog.length > 0 ? (
                    progressLog.map((entry, index) => (
                      <div key={index} className="mb-1.5">
                        {entry}
                      </div>
                    ))
                  ) : (
                    <div className="opacity-70">No progress events yet.</div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs text-slate-500">Backend request details</h3>
                <pre className="max-h-56 min-h-28 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[#0f1722] p-3.5 font-mono text-xs text-slate-300">
                  {requestContent || 'No request content available.'}
                </pre>
              </section>

              <section>
                <h3 className="mb-2 text-xs text-slate-500">LLM request content</h3>
                <pre className="max-h-56 min-h-28 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[#0f1722] p-3.5 font-mono text-xs text-slate-300">
                  {llmRequestContent || 'Waiting for the LLM request to be built...'}
                </pre>
              </section>

              <details className="rounded-xl border border-slate-800 bg-[#020917] p-3">
                <summary className="cursor-pointer text-xs font-bold text-amber-500">Dev Stats</summary>
                <div className="mt-2 grid gap-2 font-mono text-xs text-slate-300">
                  <div>Request tokens: {devStats?.request_tokens ?? 'N/A'}</div>
                  <div>Response tokens: {devStats?.response_tokens ?? 'N/A'}</div>
                  <div>Total tokens: {devStats?.total_tokens ?? 'N/A'}</div>
                </div>
              </details>

              <section>
                <h3 className="mb-2 text-xs text-slate-500">Full raw response</h3>
                <pre className="max-h-80 min-h-40 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-[#0f1722] p-3.5 font-mono text-xs text-slate-300">
                  {rawResponse || 'Waiting for the LLM response to arrive...'}
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
