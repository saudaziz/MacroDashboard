import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Info,
  Clock,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { calculateRegimeProbabilities, getDailyMaterialMoves } from '../utils/formatters';

interface TopIntelligenceBarProps {
  riskScore?: number;
  spread10Y2Y?: number;
  icr?: number;
  vix?: number;
  unrate?: number;
  data?: any;
}

export const TopIntelligenceBar: React.FC<TopIntelligenceBarProps> = ({
  riskScore = 5.0,
  spread10Y2Y = 0.48,
  icr = 2.15,
  vix = 15.52,
  unrate = 4.2,
  data,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const probs = calculateRegimeProbabilities({ riskScore, spread10Y2Y, icr, vix, unrate });
  const materialMoves = getDailyMaterialMoves(data);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-[#0d1420] p-3.5 shadow-lg">
      {/* 1. Regime Probability Header & Numbers */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Activity size={14} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              Regime Probability Gauge
            </span>
            <div className="relative inline-block">
              <button
                type="button"
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded cursor-pointer"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                aria-label="Explain Regime Probability Gauge"
              >
                <Info size={13} />
              </button>
              {showTooltip && (
                <div className="absolute left-0 top-6 z-50 w-80 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
                  <p className="font-semibold text-amber-400 mb-1">Regime Probability Gauge Explained:</p>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    A forward 6–12 month 100% probability distribution across three mutually exclusive economic trajectories:
                  </p>
                  <ul className="space-y-1 text-slate-400 list-disc list-inside">
                    <li><strong className="text-rose-400">Recession:</strong> GDP contraction, earnings drop & layoffs.</li>
                    <li><strong className="text-amber-400">Soft Landing:</strong> Inflation cools without causing a crash (Baseline).</li>
                    <li><strong className="text-emerald-400">Expansion:</strong> Accelerating broad economic growth & capex.</li>
                  </ul>
                  <p className="text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-800">
                    Synthesizes yield un-inversion (+0.48%), corporate credit ICR (2.15x), CBOE VIX (15.52), and Sahm rule unemployment (4.2%).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Synthesized Plain Decision Metric Headline */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 font-bold text-rose-400 border border-rose-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Recession Probability: {probs.recessionProb}%
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-bold text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Soft Landing: {probs.softLandingProb}%
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Expansion: {probs.expansionProb}%
          </span>
        </div>
      </div>

      {/* Segmented Horizontal Bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-950 flex border border-slate-800">
        <div
          style={{ width: `${probs.recessionProb}%` }}
          className="h-full bg-gradient-to-r from-rose-600 to-rose-500 transition-all duration-500"
          title={`Recession: ${probs.recessionProb}%`}
        />
        <div
          style={{ width: `${probs.softLandingProb}%` }}
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          title={`Soft Landing: ${probs.softLandingProb}%`}
        />
        <div
          style={{ width: `${probs.expansionProb}%` }}
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500"
          title={`Expansion: ${probs.expansionProb}%`}
        />
      </div>

      {/* Inline Quick Definitions & Guide Toggle */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span className="font-semibold text-rose-300">Recession ({probs.recessionProb}%):</span>
            <span className="text-slate-400">GDP contraction & layoffs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">Soft Landing ({probs.softLandingProb}%):</span>
            <span className="text-slate-400">Inflation cools without crash (Baseline)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-300">Expansion ({probs.expansionProb}%):</span>
            <span className="text-slate-400">Reaccelerating growth & capex</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors self-start sm:self-auto py-0.5 px-2 rounded border border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer"
          aria-expanded={showGuide}
          aria-label="Toggle Regime Odds Interpretation Guide"
        >
          <BookOpen size={12} />
          <span>{showGuide ? 'Hide Guide' : 'How to read this odds mix?'}</span>
          {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Collapsible Regime Odds Interpretation Drawer */}
      {showGuide && (
        <div className="rounded-lg border border-amber-500/20 bg-slate-900/95 p-3.5 text-xs text-slate-300 shadow-xl transition-all space-y-3 mt-1">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <h4 className="font-mono font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>Understanding Macro Regime Probabilities</span>
                <span className="text-[10px] font-normal normal-case text-slate-400">
                  (Forward 6–12 Month Distribution = 100%)
                </span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                These three figures represent the mutually exclusive probability distribution of macroeconomic trajectories over the next 6 to 12 months. Together they always total 100%.
              </p>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="text-slate-500 hover:text-slate-300 text-xs p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close guide"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Recession */}
            <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-rose-400 flex items-center gap-1 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Recession Probability ({probs.recessionProb}%)
                  </span>
                  <span className="text-[10px] font-mono text-rose-400/80 bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">
                    Elevated Risk
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                  <strong>What it means:</strong> Two or more consecutive quarters of negative GDP growth, corporate earnings contraction (-15% to -25%), and spiking unemployment (Sahm rule trigger ≥0.50%).
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <strong>Why {probs.recessionProb}%:</strong> The historic yield curve un-inversion (+0.48%) and unemployment ticking to 4.2% keep recession odds above the normal historical baseline (~15%).
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-rose-500/10 text-[10px] text-rose-300/90 font-mono">
                Strategy: Watch 40% danger tripwire. Maintain Treasury & cash buffers.
              </div>
            </div>

            {/* Card 2: Soft Landing */}
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Soft Landing ({probs.softLandingProb}%)
                  </span>
                  <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                    Modal Baseline
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                  <strong>What it means:</strong> The Federal Reserve cools inflation down toward 2.0% without triggering widespread layoffs or an economic recession. Growth slows to modest positive levels (+1% to +2%).
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <strong>Why {probs.softLandingProb}%:</strong> This is currently the most probable path (modal baseline) because rate cuts (Fed Funds easing toward 3.75%) provide relief while corporate balance sheets hold.
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-500/10 text-[10px] text-amber-300/90 font-mono">
                Strategy: Favors quality dividend equities, intermediate bonds & credit.
              </div>
            </div>

            {/* Card 3: Expansion */}
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Expansion ({probs.expansionProb}%)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                    Constrained
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                  <strong>What it means:</strong> Reaccelerating economic output, strong corporate revenue growth, increasing capital expenditure, robust consumer demand, and a broad market rally.
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  <strong>Why {probs.expansionProb}%:</strong> Odds are constrained because central bank policy rates (3.75%) remain in moderately restrictive territory, keeping borrowing costs elevated for new capex.
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-500/10 text-[10px] text-emerald-300/90 font-mono">
                Strategy: Full cyclical equity overweight once easing becomes stimulative.
              </div>
            </div>
          </div>

          {/* Practical Decision Rule for Investors */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded bg-slate-950/70 p-2.5 border border-slate-800 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-400 uppercase text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                Decision Rule
              </span>
              <span className="text-slate-300 leading-relaxed">
                At <strong>{probs.softLandingProb}% Soft Landing</strong> vs <strong>{probs.recessionProb}% Recession</strong>: Stay invested in resilient quality equities, but keep high-grade Treasury and cash duration hedges intact while the post-inversion lag resolves.
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap self-end sm:self-auto">
              Sum: {probs.recessionProb + probs.softLandingProb + probs.expansionProb}% (100% distribution)
            </span>
          </div>
        </div>
      )}

      {/* 2. 'What Changed Since Yesterday?' Alert Ticker Box */}
      <div className="mt-1 flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-[#080d16] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            <Zap size={12} className="text-amber-400 fill-amber-400 animate-pulse" />
            <span>What Changed Since Yesterday:</span>
          </div>
        </div>

        {/* Dynamic Chips of Material Daily Movers */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          {materialMoves.map((m) => {
            const isUp = m.direction === 'up';
            return (
              <div
                key={m.id}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 border ${
                  m.isSignificant
                    ? 'border-amber-500/30 bg-amber-500/5 text-slate-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                {isUp ? (
                  <TrendingUp size={12} className="text-emerald-400" />
                ) : (
                  <TrendingDown size={12} className="text-rose-400" />
                )}
                <span className="font-semibold text-slate-300">{m.name}</span>
                <span className={isUp ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {m.changeText}
                </span>
                <span className="text-[10px] text-slate-500">({m.currentValue})</span>
              </div>
            );
          })}
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-500">
            <Clock size={10} />
            <span>Updated 24h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
