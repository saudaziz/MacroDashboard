import React, { useState } from 'react';
import { History, Info } from 'lucide-react';

interface IndicatorOverlay {
  id: string;
  name: string;
  val2001: string;
  val2008: string;
  val2020: string;
  valNow: string;
  significance: string;
  status: 'alert' | 'watch' | 'calm';
}

const HISTORICAL_OVERLAYS: IndicatorOverlay[] = [
  {
    id: 'fedfunds',
    name: 'Fed Funds Rate',
    val2001: '6.50% peak',
    val2008: '5.25% → 2.0%',
    val2020: '1.75% → 0.25%',
    valNow: '3.75% (cuts begun)',
    significance: 'Rate cut velocity indicates whether Fed is normalizing or panic-easing.',
    status: 'watch',
  },
  {
    id: 't10y2y',
    name: '10Y-2Y Yield Spread',
    val2001: '-0.45% → +0.65%',
    val2008: '-0.15% → +0.70%',
    val2020: '-0.05% → +0.40%',
    valNow: '+0.48% (steepening)',
    significance: 'The recession hits AFTER the un-inversion occurs, not during the inversion.',
    status: 'alert',
  },
  {
    id: 'vix',
    name: 'CBOE VIX Volatility',
    val2001: '38.2 peak',
    val2008: '80.1 peak',
    val2020: '82.7 peak',
    valNow: '15.52 (complacent)',
    significance: 'VIX stayed calm (<16) right before both 2001 & 2008 before violently spiking.',
    status: 'calm',
  },
  {
    id: 'unrate',
    name: 'Sahm Rule / Unemployment',
    val2001: '4.2% → 5.7%',
    val2008: '4.6% → 10.0%',
    val2020: '3.5% → 14.7%',
    valNow: '4.0% (watch ≥ 4.3%)',
    significance: 'Every recession began once unemployment climbed 0.5% above cyclical low.',
    status: 'watch',
  },
  {
    id: 'hy_oas',
    name: 'High-Yield OAS Spread',
    val2001: '950 bps',
    val2008: '1,980 bps',
    val2020: '1,080 bps',
    valNow: '325 bps (tight)',
    significance: 'Credit spreads widen only 60-90 days before defaults surge.',
    status: 'calm',
  },
];

// SVG sparklines for lead-in trajectories
const Sparkline: React.FC<{ points: number[]; color: string; width?: number; height?: number }> = ({
  points,
  color,
  width = 140,
  height = 36,
}) => {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const path = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible inline-block">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const HistoricalComparisonSidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overlay' | 'leadins'>('overlay');

  return (
    <div className="flex flex-col rounded-xl border border-slate-800 bg-[#0d1420] p-4 text-slate-100 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-purple-500/10 p-1.5 text-purple-400 border border-purple-500/30">
            <History size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                Historical Comparison: Last 3 Recessions
              </h3>
              <span className="font-mono text-[9px] text-amber-400 font-semibold uppercase">by Saud Aziz</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Side-by-side indicator overlay: 2001 vs 2008 vs 2020 vs Today
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('overlay')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-colors ${
              activeTab === 'overlay' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overlay
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leadins')}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-colors ${
              activeTab === 'leadins' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sparklines
          </button>
        </div>
      </div>

      {/* Mode 1: Historical Indicator Overlay Table */}
      {activeTab === 'overlay' && (
        <div className="space-y-2.5">
          <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#080d16]">
            <table className="w-full text-left text-[11px] border-collapse font-mono">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0d1420] text-[10px] text-slate-400 uppercase">
                  <th className="py-2 px-2.5">Indicator</th>
                  <th className="py-2 px-2 text-slate-400">2001 (Tech)</th>
                  <th className="py-2 px-2 text-slate-400">2008 (GFC)</th>
                  <th className="py-2 px-2 text-slate-400">2020 (COVID)</th>
                  <th className="py-2 px-2.5 text-amber-400 font-bold bg-amber-500/5">Now (2025/26)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {HISTORICAL_OVERLAYS.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2 px-2.5 text-slate-200 font-sans font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.status === 'alert'
                              ? 'bg-rose-500'
                              : row.status === 'watch'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-slate-400">{row.val2001}</td>
                    <td className="py-2 px-2 text-slate-400">{row.val2008}</td>
                    <td className="py-2 px-2 text-slate-400">{row.val2020}</td>
                    <td className="py-2 px-2.5 text-amber-300 font-bold bg-amber-500/5">{row.valNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-slate-200">How unusual is this? </span>
              Today's un-inversion (+0.48%) while VIX remains compressed (15.5) closely replicates the 2007 pre-crisis window before credit cracks surfaced.
            </p>
          </div>
        </div>
      )}

      {/* Mode 2: 5-Year Pre-Crash Sparklines & Pattern Recognition */}
      {activeTab === 'leadins' && (
        <div className="space-y-3">
          {/* 2008 GFC Lead-In */}
          <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-[11px] font-bold text-slate-200">
                2008 GFC: 5-Year Pre-Crash Pattern
              </div>
              <span className="text-[10px] font-mono text-rose-400 font-semibold">Lag: ~10 mos</span>
            </div>
            <div className="flex items-center justify-between">
              <Sparkline points={[1.2, 2.5, 4.8, 5.25, 4.0, 2.0, 0.25]} color="#f43f5e" />
              <p className="text-[10px] text-slate-400 max-w-[190px] leading-snug">
                Fed hiked to 5.25% → curve inverted → un-inverted late 2007 → severe liquidation crash in 2008.
              </p>
            </div>
          </div>

          {/* 2001 Dot-Com Lead-In */}
          <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-[11px] font-bold text-slate-200">
                2001 Dot-Com: 5-Year Pre-Crash Pattern
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-semibold">Lag: ~6 mos</span>
            </div>
            <div className="flex items-center justify-between">
              <Sparkline points={[5.0, 5.5, 6.5, 6.0, 4.0, 2.5, 1.75]} color="#f59e0b" />
              <p className="text-[10px] text-slate-400 max-w-[190px] leading-snug">
                Fed hiked to 6.5% → deep curve inversion → un-inverted in Jan 2001 → tech capex freeze followed.
              </p>
            </div>
          </div>

          {/* 2025/2026 Today's Trajectory */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-[11px] font-bold text-amber-400">
                Current Cycle: 2021–2026 Trajectory
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">Active Window</span>
            </div>
            <div className="flex items-center justify-between">
              <Sparkline points={[0.25, 1.5, 4.5, 5.5, 5.25, 4.5, 3.75]} color="#06b6d4" />
              <p className="text-[10px] text-slate-300 max-w-[190px] leading-snug">
                ZIRP → aggressive hikes to 5.5% → 2yr inversion → steepening un-inversion (+0.48%) active now.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
