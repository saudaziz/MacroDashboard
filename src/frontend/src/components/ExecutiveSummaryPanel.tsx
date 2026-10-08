import React from 'react';
import { AlertCircle, BookOpen, CheckCircle2, CloudRain, Lightbulb, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { Card, SectionTitle } from './UIAtoms';
import type { ExecutiveSummary } from '../types';
import { RecessionPlaybookModal } from './RecessionPlaybookModal';

interface ExecutiveSummaryPanelProps {
  data?: ExecutiveSummary | undefined;
  riskScore?: number | undefined;
}

const DEFAULT_SUMMARY: ExecutiveSummary = {
  status_label: 'Caution: Late-Cycle Transition',
  market_weather: 'Storm Clouds Gathering',
  traffic_light: 'YELLOW',
  plain_english_headline:
    'Stock indexes are near all-time highs, but carried by only a few mega-tech giants while borrowing stress and bond signals point to a coming slowdown.',
  plain_english_explanation:
    "On the surface, markets seem calm with volatility (VIX) suppressed. However, market breadth has severely narrowed ('The Unbroadening') with the average stock lagging. At the same time, the Treasury yield curve has un-inverted and steepened—a classic historical precursor to market pullbacks. Rising credit card and loan delinquencies show consumer balance sheets are under pressure.",
  actionable_advice: [
    '1. Build & Guard Cash: Maintain a 6-12 month emergency buffer in high-yield cash or Treasuries earning ~4-5%.',
    '2. Trim Overextended Winners: Lock in gains from concentrated tech positions and rebalance into diversified assets.',
    '3. Lock In Bond Yields: Secure attractive yields in 5-10Y Treasuries before future rate cuts.',
    '4. Avoid FOMO Chasing: Do not buy speculative stocks at all-time highs without strict risk rules.',
  ],
  tripwires: [
    '1. Labor Market Deterioration (Sahm Rule): Unemployment rate rises above 4.3% (Current: 4.2%). Historical recession lag: 0–2 months.',
    '2. Mega-Cap Earnings Stumble: Hyperscaler AI capex returns disappoint or cloud growth slows. Market selloff lag: 1–3 months.',
    '3. Corporate Refinancing Stress: High-yield spreads widen > 500 bps or mid-cap ICR drops below 1.8x (Current: 2.15x). Recession lag: 2–4 months.',
    '4. Volatility Spike (The Awakening): CBOE VIX surges above 20–25 from current 15.5. Pullback lag: Immediate (days to weeks).',
  ],
};

export const ExecutiveSummaryPanel: React.FC<ExecutiveSummaryPanelProps> = ({ data = DEFAULT_SUMMARY, riskScore = 5 }) => {
  const [activeTab, setActiveTab] = React.useState<'actions' | 'tripwires'>('actions');
  const [isPlaybookOpen, setIsPlaybookOpen] = React.useState<boolean>(false);
  const summary = data || DEFAULT_SUMMARY;
  const isHighAlert = (riskScore >= 7) || summary.traffic_light === 'RED';

  const badgeBg = isHighAlert ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  const badgeIcon = isHighAlert ? <ShieldAlert size={14} className="text-red-400" /> : <CloudRain size={14} className="text-amber-400" />;

  const tripwireItems = summary.tripwires && summary.tripwires.length > 0
    ? summary.tripwires
    : DEFAULT_SUMMARY.tripwires || [];

  return (
    <Card className="flex flex-col justify-between border-slate-800 bg-[#0d1420] p-5 shadow-lg">
      <div className="space-y-4">
        {/* Header with Traffic Light Weather & Deep Dive Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <SectionTitle>Executive Summary by Saud Aziz (Everyday Investor Guide)</SectionTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaybookOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 hover:border-amber-400 transition-colors shadow-sm"
            >
              <BookOpen size={13} />
              <span>Deep Dive: Recession Playbook</span>
            </button>
            <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider ${badgeBg}`}>
              {badgeIcon}
              <span>{summary.market_weather}</span>
            </div>
          </div>
        </div>

        {/* Plain-Language Headline */}
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">What is happening right now:</div>
          <h3 className="text-base font-bold leading-snug text-slate-100 md:text-lg">
            {summary.plain_english_headline}
          </h3>
        </div>

        {/* Plain English Translation Pillars */}
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-800/60 bg-[#080d16] p-3 text-xs md:grid-cols-3">
          <div className="space-y-1 border-slate-800 md:border-r md:pr-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <TrendingUp size={14} />
              <span>1. The Heavy Lifters</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Only a handful of giant tech stocks are driving indexes up ("The Unbroadening"). Most ordinary companies are already lagging.
            </p>
          </div>

          <div className="space-y-1 border-slate-800 md:border-r md:pr-3">
            <div className="flex items-center gap-1.5 font-bold text-cyan-400">
              <AlertCircle size={14} />
              <span>2. Bond Warning Clock</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              The 10Y vs 2Y yield curve is "un-inverting". In history, stock market corrections happen when the curve un-inverts as the economy cools.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldAlert size={14} />
              <span>3. Deceptive Calm</span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Market volatility (VIX) feels low and calm. But long quiet periods often end in fast, sharp pullbacks when surprises hit.
            </p>
          </div>
        </div>

        {/* Interactive Bottom Section: Actions vs Tripwires */}
        <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300">
              {activeTab === 'actions' ? <Lightbulb size={14} className="text-amber-400" /> : <ShieldAlert size={14} className="text-red-400" />}
              <span>{activeTab === 'actions' ? 'Action Checklist (What to do today):' : 'Recession Tripwires (What to watch for next):'}</span>
            </div>
            <div className="flex items-center gap-1 rounded bg-[#0d1420] p-0.5 border border-slate-800 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`rounded px-2.5 py-1 font-bold transition-colors ${
                  activeTab === 'actions' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Action Checklist
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tripwires')}
                className={`rounded px-2.5 py-1 font-bold transition-colors ${
                  activeTab === 'tripwires' ? 'bg-red-500 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                What to Watch (Tripwires)
              </button>
            </div>
          </div>

          {activeTab === 'actions' ? (
            <ul className="grid grid-cols-1 gap-2 text-xs text-slate-300 md:grid-cols-2">
              {summary.actionable_advice.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid grid-cols-1 gap-2 text-xs text-slate-300 md:grid-cols-2">
              {tripwireItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400 animate-pulse" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60 pt-2 font-mono text-[10px] text-slate-500">
        <span>Audience: Plain-English • Framework by Saud Aziz</span>
        <button
          type="button"
          onClick={() => setIsPlaybookOpen(true)}
          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
        >
          <BookOpen size={11} />
          <span>View 4 Shocks & Historical Lag Horizons</span>
        </button>
      </div>

      <RecessionPlaybookModal isOpen={isPlaybookOpen} onClose={() => setIsPlaybookOpen(false)} />
    </Card>
  );
};
