import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import { calculateRegimeProbabilities, getDailyMaterialMoves } from '../utils/formatters';

interface TopIntelligenceBarProps {
  riskScore?: number;
  spread10Y2Y?: number;
  icr?: number;
  vix?: number;
  unrate?: number;
}

export const TopIntelligenceBar: React.FC<TopIntelligenceBarProps> = ({
  riskScore = 5.0,
  spread10Y2Y = 0.48,
  icr = 2.15,
  vix = 15.52,
  unrate = 4.0,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const probs = calculateRegimeProbabilities({ riskScore, spread10Y2Y, icr, vix, unrate });
  const materialMoves = getDailyMaterialMoves();

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
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                aria-label="Explain Regime Probability Gauge"
              >
                <Info size={13} />
              </button>
              {showTooltip && (
                <div className="absolute left-0 top-6 z-50 w-72 rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-[11px] text-slate-300 shadow-xl backdrop-blur-md">
                  <p className="font-semibold text-amber-400 mb-1">How This is Calculated:</p>
                  <p className="text-slate-400 leading-relaxed">
                    Synthesizes yield un-inversion speed (+0.48%), corporate credit ICR (2.15x), CBOE VIX (15.52), and Sahm rule unemployment into a single quantitative market regime probability.
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
