import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Clock,
  Activity,
  CheckCircle2,
  Sliders,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

interface RecessionPlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CatalystNode {
  id: string;
  name: string;
  timeX: string; // 'Immediate (< 1 Mo)', '1–3 Mos', '3–6 Mos', '6–14 Mos'
  timeColIndex: number; // 0, 1, 2, 3
  severityY: 'Extreme' | 'High' | 'Structural';
  severityRowIndex: number; // 0 (Extreme), 1 (High), 2 (Structural)
  whatFails: string;
  currentVal: string;
  dangerThreshold: string;
  lag: string;
  color: string;
}

const CATALYSTS: CatalystNode[] = [
  {
    id: 'vix',
    name: '5. Volatility Awakening (VIX > 25)',
    timeX: 'Immediate (Days to Weeks)',
    timeColIndex: 0,
    severityY: 'Extreme',
    severityRowIndex: 0,
    whatFails: 'Options market reprices downside tail risks; liquidity suddenly evaporates',
    currentVal: '15.52',
    dangerThreshold: 'VIX surges and holds > 25.0',
    lag: 'Days to weeks (Immediate)',
    color: '#a855f7',
  },
  {
    id: 'labor',
    name: '3. Labor Market (Sahm Rule Fires ⚠️)',
    timeX: '0–2 Months',
    timeColIndex: 0,
    severityY: 'Extreme',
    severityRowIndex: 0,
    whatFails: 'Hiring freezes morph into broad layoffs; consumer aggregate demand collapses',
    currentVal: '4.2%',
    dangerThreshold: 'Sahm Rule fires (≥ 4.3%–4.5%)',
    lag: '0 to 2 months (Simultaneous)',
    color: '#f43f5e',
  },
  {
    id: 'credit',
    name: '2. Corporate Credit Crunch',
    timeX: '2–4 Months',
    timeColIndex: 1,
    severityY: 'High',
    severityRowIndex: 1,
    whatFails: 'Debt wall maturity refinancing fails; mid-cap defaults surge',
    currentVal: 'ICR 2.15x',
    dangerThreshold: 'HY OAS > 500 bps, ICR < 1.8x',
    lag: '2 to 4 months',
    color: '#f59e0b',
  },
  {
    id: 'capex',
    name: '4. AI Capex Disappointment',
    timeX: '1–3 Months',
    timeColIndex: 1,
    severityY: 'High',
    severityRowIndex: 1,
    whatFails: 'Mega-cap hyperscalers prune cloud spend; growth multiples de-rate',
    currentVal: 'P/E ~21.5x',
    dangerThreshold: 'Guidance cuts across 2+ hyperscalers',
    lag: '1 to 3 months',
    color: '#38bdf8',
  },
  {
    id: 'curve',
    name: '1. Yield Curve Steepening',
    timeX: '6–14 Months',
    timeColIndex: 3,
    severityY: 'Structural',
    severityRowIndex: 2,
    whatFails: 'Fed cuts short rates rapidly as growth cools; un-inversion starter pistol',
    currentVal: '+0.48%',
    dangerThreshold: 'Spread widens > +0.80% on falling 2Y',
    lag: '3 to 14 months (avg. ~6 months)',
    color: '#10b981',
  },
];

export const RecessionPlaybookModal: React.FC<RecessionPlaybookModalProps> = ({ isOpen, onClose }) => {
  const [catalystView, setCatalystView] = useState<'timeline' | 'table'>('timeline');
  const [selectedCatalyst, setSelectedCatalyst] = useState<CatalystNode | null>(CATALYSTS[1] ?? null); // default to Sahm rule

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex flex-col max-h-[92vh] w-full max-w-5xl rounded-xl border border-slate-700 bg-[#0d1420] text-slate-100 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#080d16] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-400 border border-red-500/30">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>The Recession Playbook: Transmission Mechanics & Historical Shocks</span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30 uppercase">
                  by Saud Aziz
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 border border-slate-700 uppercase">
                  Educational Deep Dive
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authored by Saud Aziz • Transmission stages, real-time indicators, and interactive catalyst timelines.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-xs text-slate-300">
          
          {/* Section 1: The 4-Stage Transmission Sequence */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-amber-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-amber-400">
                  1. The Transmission Chain: How an Un-Inversion Becomes a Recession
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Tightened stage descriptions with active progress cursor
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {/* Stage 1: Active Stage */}
              <div className="relative rounded-lg border-2 border-cyan-500 bg-cyan-950/30 p-3 flex flex-col justify-between shadow-lg shadow-cyan-950/50">
                <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-cyan-500 px-2 py-0.5 text-[9px] font-mono font-extrabold text-black uppercase tracking-wider shadow">
                  <MapPin size={10} className="fill-black" />
                  <span>WE ARE HERE</span>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-cyan-400 uppercase font-bold mb-1">
                    Stage 1 (Today)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Yield Un-Inversion</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    10Y-2Y spread steepens to <span className="font-mono text-cyan-300 font-bold">+0.48%</span> as the Fed cuts rates (<span className="font-mono">3.75%–4.00%</span>).
                  </p>
                  <p className="text-[10px] text-cyan-200/80 bg-cyan-900/30 p-1.5 rounded border border-cyan-800/40 leading-snug">
                    <span className="font-semibold text-cyan-300">Why it matters: </span>
                    Inversions predict risk, but the un-inversion is the starter pistol firing when rate cuts confirm cooling growth.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold border-t border-cyan-900/50 pt-2">
                  <span>Starter Pistol</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Stage 2 */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-amber-400 uppercase font-bold mb-1">
                    Stage 2 (Refinancing)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Debt Wall Crunch ⚠️</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Mid-caps face 7–9% refinancing on 2021 low-rate loans. Mid-cap ICR at <span className="font-mono text-amber-300 font-semibold">2.15x</span>; defaults surge if ICR &lt; 1.8x.
                  </p>
                  <p className="text-[10px] text-amber-300/80 bg-amber-900/20 p-1.5 rounded border border-amber-800/40 leading-snug">
                    <span className="font-semibold text-amber-300">Why it matters: </span>
                    Rolling low-rate maturities into restrictive rates burns free cash flow, compelling corporate capex freezes.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-amber-400/80 border-t border-amber-900/50 pt-2">
                  <span>Lag: 2–4 Mos</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Stage 3 */}
              <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-rose-400 uppercase font-bold mb-1">
                    Stage 3 (Labor Cracks)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1 flex items-center gap-1">
                    <span>Sahm Rule Fires ⚠️</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Unemployment rises to <span className="font-mono text-rose-300 font-semibold">≥ 4.3%</span>. Corporate hiring freezes turn into broad layoffs.
                  </p>
                  <p className="text-[10px] text-rose-300/80 bg-rose-900/20 p-1.5 rounded border border-rose-800/40 leading-snug">
                    <span className="font-semibold text-rose-300">Why it matters: </span>
                    ~3 months to layoffs. A 0.5% uptick in unemployment creates self-reinforcing income loss and aggregate demand collapse.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-rose-400/80 border-t border-rose-900/50 pt-2">
                  <span>Lag: ~3 Mos to Layoffs</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Stage 4 */}
              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-red-400 uppercase font-bold mb-1">
                    Stage 4 (Market Reset)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1">VIX & Earnings Shock ⚠️</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Earnings downgrades spread. Volatility awakens violently (<span className="font-mono text-red-300 font-semibold">VIX &gt; 25</span>); liquidity contracts.
                  </p>
                  <p className="text-[10px] text-red-300/80 bg-red-900/20 p-1.5 rounded border border-red-800/40 leading-snug">
                    <span className="font-semibold text-red-300">Why it matters: </span>
                    Valuation multiples de-rate abruptly, prompting margin calls and rapid flight to sovereign safe havens.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-red-400 border-t border-red-900/50 pt-2">
                  <span>Lag: Days to Weeks</span>
                  <ShieldAlert size={12} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Real-Time Readings vs Recession Tripwires Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={16} className="text-red-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-red-400">
                2. Real-Time Macro Readings vs. Recession Tripwires
              </h3>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080d16]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1420] font-mono text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Indicator</th>
                    <th className="py-2.5 px-3">FRED Ticker</th>
                    <th className="py-2.5 px-3 text-amber-400 font-bold">Current Real-Time Value</th>
                    <th className="py-2.5 px-3">Safe / Normal Range</th>
                    <th className="py-2.5 px-3 text-red-400">Recession Danger Tripwire</th>
                    <th className="py-2.5 px-3">Current Regime Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">Fed Funds Target Rate</td>
                    <td className="py-2 px-3 text-slate-500">DFEDTARL / DFEDTARU</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">3.75% – 4.00%</td>
                    <td className="py-2 px-3 text-slate-400">2.50% – 3.00%</td>
                    <td className="py-2 px-3 text-red-300">Rapid panic cuts (&lt; 3.00%)</td>
                    <td className="py-2 px-3"><span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px]">Easing Cycle</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">Effective Fed Funds (DFF)</td>
                    <td className="py-2 px-3 text-slate-500">DFF</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">3.75%</td>
                    <td className="py-2 px-3 text-slate-400">2.50% – 3.25%</td>
                    <td className="py-2 px-3 text-red-300">Emergency inter-meeting cuts</td>
                    <td className="py-2 px-3"><span className="rounded bg-slate-700/60 text-slate-300 px-2 py-0.5 text-[10px]">Elevated</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20 bg-amber-500/5">
                    <td className="py-2 px-3 font-semibold text-slate-200">10Y-2Y Treasury Spread</td>
                    <td className="py-2 px-3 text-slate-500">T10Y2Y</td>
                    <td className="py-2 px-3 text-emerald-400 font-bold">+0.48%</td>
                    <td className="py-2 px-3 text-slate-400">+0.75% to +1.50%</td>
                    <td className="py-2 px-3 text-rose-400 font-semibold">Un-inversion from deep negative</td>
                    <td className="py-2 px-3"><span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px] font-bold">Danger Window</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">10-Year Treasury Yield</td>
                    <td className="py-2 px-3 text-slate-500">DGS10</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">5.31%</td>
                    <td className="py-2 px-3 text-slate-400">3.50% – 4.50%</td>
                    <td className="py-2 px-3 text-red-300">Sharp drop &lt; 4.0% (growth scare)</td>
                    <td className="py-2 px-3"><span className="rounded bg-slate-700/60 text-slate-300 px-2 py-0.5 text-[10px]">Elevated Discount Rate</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">2-Year Treasury Yield</td>
                    <td className="py-2 px-3 text-slate-500">DGS2</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">4.84%</td>
                    <td className="py-2 px-3 text-slate-400">3.00% – 4.00%</td>
                    <td className="py-2 px-3 text-red-300">Collapsing faster than 10Y</td>
                    <td className="py-2 px-3"><span className="rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 text-[10px]">Front-End Easing</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">CBOE Volatility (VIX)</td>
                    <td className="py-2 px-3 text-slate-500">VIXCLS</td>
                    <td className="py-2 px-3 text-purple-400 font-bold">15.52</td>
                    <td className="py-2 px-3 text-slate-400">12.00 – 18.00</td>
                    <td className="py-2 px-3 text-red-300 font-semibold">&gt; 20.0 Alert, &gt; 30.0 Crisis</td>
                    <td className="py-2 px-3"><span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[10px]">Complacent Calm</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">Mid-Cap Interest Coverage (ICR)</td>
                    <td className="py-2 px-3 text-slate-500">ICR Proxy</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">2.15x</td>
                    <td className="py-2 px-3 text-slate-400">&gt; 3.00x</td>
                    <td className="py-2 px-3 text-red-300 font-semibold">&lt; 1.80x (Refinancing Crunch)</td>
                    <td className="py-2 px-3"><span className="rounded bg-amber-500/20 text-amber-300 px-2 py-0.5 text-[10px]">Vulnerable Buffer</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-2 px-3 font-semibold text-slate-200">High-Yield Spread (OAS)</td>
                    <td className="py-2 px-3 text-slate-500">BAMLH0A0HYM2</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">~325 bps</td>
                    <td className="py-2 px-3 text-slate-400">300 – 400 bps</td>
                    <td className="py-2 px-3 text-red-300 font-semibold">&gt; 500 bps (Credit Freezing)</td>
                    <td className="py-2 px-3"><span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px]">Complacent Spreads</span></td>
                  </tr>
                  <tr className="hover:bg-slate-800/20 bg-rose-500/5">
                    <td className="py-2 px-3 font-semibold text-slate-200">Unemployment Rate (Sahm Rule)</td>
                    <td className="py-2 px-3 text-slate-500">UNRATE</td>
                    <td className="py-2 px-3 text-amber-400 font-bold">4.2%</td>
                    <td className="py-2 px-3 text-slate-400">3.5% – 4.2%</td>
                    <td className="py-2 px-3 text-red-400 font-bold">≥ 4.3% – 4.5%</td>
                    <td className="py-2 px-3"><span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold">Tripwire Watch</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Shock Catalysts Timeline (Time to Recession vs Severity) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-cyan-400">
                  3. Shock Catalysts: Timeline Matrix & Lag Horizons
                </h3>
              </div>

              {/* View Switcher: Interactive Timeline vs Table */}
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCatalystView('timeline')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-colors ${
                    catalystView === 'timeline'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders size={12} />
                  <span>Timeline Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalystView('table')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-colors ${
                    catalystView === 'table'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reference Table
                </button>
              </div>
            </div>

            {/* View A: 2D Interactive Timeline Matrix */}
            {catalystView === 'timeline' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-[#080d16] p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300">Y-Axis: Severity / Impact</span>
                    <span className="text-cyan-400">X-Axis: Time Horizon to Recession (Fastest → Structural)</span>
                  </div>

                  {/* 2D Matrix Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono text-slate-500 mb-2">
                    <div className="bg-slate-900/60 py-1 rounded">Immediate (&lt; 1 Mo)</div>
                    <div className="bg-slate-900/60 py-1 rounded">Short (1–3 Mos)</div>
                    <div className="bg-slate-900/60 py-1 rounded">Medium (3–6 Mos)</div>
                    <div className="bg-slate-900/60 py-1 rounded">Structural (6–14 Mos)</div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 min-h-[170px] bg-slate-950/40 p-2 rounded-lg border border-slate-800/80">
                    {/* Col 0: Immediate */}
                    <div className="flex flex-col gap-2">
                      {CATALYSTS.filter((c) => c.timeColIndex === 0).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCatalyst(cat)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                            selectedCatalyst?.id === cat.id
                              ? 'border-rose-400 bg-rose-950/40 shadow-md ring-1 ring-rose-400'
                              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] font-bold uppercase" style={{ color: cat.color }}>
                              {cat.severityY}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{cat.lag}</span>
                          </div>
                          <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                            {cat.name}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Col 1: Short (1-3 Mos) */}
                    <div className="flex flex-col gap-2">
                      {CATALYSTS.filter((c) => c.timeColIndex === 1).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCatalyst(cat)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                            selectedCatalyst?.id === cat.id
                              ? 'border-amber-400 bg-amber-950/40 shadow-md ring-1 ring-amber-400'
                              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] font-bold uppercase" style={{ color: cat.color }}>
                              {cat.severityY}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{cat.lag}</span>
                          </div>
                          <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                            {cat.name}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Col 2: Medium (3-6 Mos) */}
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-800/60 rounded-lg p-2 text-slate-600 text-[10px]">
                      <span>Transmission Bridge</span>
                    </div>

                    {/* Col 3: Structural (6-14 Mos) */}
                    <div className="flex flex-col gap-2">
                      {CATALYSTS.filter((c) => c.timeColIndex === 3).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCatalyst(cat)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                            selectedCatalyst?.id === cat.id
                              ? 'border-emerald-400 bg-emerald-950/40 shadow-md ring-1 ring-emerald-400'
                              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[9px] font-bold uppercase" style={{ color: cat.color }}>
                              {cat.severityY}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{cat.lag}</span>
                          </div>
                          <div className="font-semibold text-slate-200 text-[11px] leading-tight">
                            {cat.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detail Inspector for Selected Catalyst */}
                {selectedCatalyst && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={14} style={{ color: selectedCatalyst.color }} />
                        <h4 className="font-bold text-slate-100 text-xs">{selectedCatalyst.name}</h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          Horizon: {selectedCatalyst.timeX}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed mb-1">
                        {selectedCatalyst.whatFails}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                        <span>Current: <strong className="text-amber-400">{selectedCatalyst.currentVal}</strong></span>
                        <span>Danger Threshold: <strong className="text-rose-400">{selectedCatalyst.dangerThreshold}</strong></span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono">
                      <div className="text-[10px] text-slate-500 uppercase">Historical Lag</div>
                      <div className="text-xs font-bold text-cyan-400">{selectedCatalyst.lag}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View B: Comprehensive Reference Table */}
            {catalystView === 'table' && (
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080d16]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0d1420] font-mono text-[11px] text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Shock Catalyst</th>
                      <th className="py-2.5 px-3">What Fails in the Economy</th>
                      <th className="py-2.5 px-3">Current Metric</th>
                      <th className="py-2.5 px-3 text-red-400">Danger Threshold</th>
                      <th className="py-2.5 px-3 text-cyan-400 font-bold">Historical Lag to Recession</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2 px-3 font-semibold text-slate-200">1. Yield Curve Steepening</td>
                      <td className="py-2 px-3 text-slate-400">Fed cuts short rates rapidly as growth cools</td>
                      <td className="py-2 px-3 text-emerald-400">+0.48%</td>
                      <td className="py-2 px-3 text-red-300">Spread widens &gt; +0.80% on falling 2Y</td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">3 to 14 months (avg. ~6 months)</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2 px-3 font-semibold text-slate-200">2. Corporate Credit Crunch</td>
                      <td className="py-2 px-3 text-slate-400">Debt wall maturity refinancing fails</td>
                      <td className="py-2 px-3 text-amber-400">ICR 2.15x</td>
                      <td className="py-2 px-3 text-red-300">HY OAS &gt; 500 bps, ICR &lt; 1.8x</td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">2 to 4 months</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20 bg-rose-500/5">
                      <td className="py-2 px-3 font-semibold text-slate-200">3. Labor Market Deterioration</td>
                      <td className="py-2 px-3 text-slate-400">Hiring freezes morph into broad layoffs</td>
                      <td className="py-2 px-3 text-amber-400">4.2%</td>
                      <td className="py-2 px-3 text-rose-300 font-bold">Sahm Rule fires (≥ 4.3%–4.5%)</td>
                      <td className="py-2 px-3 text-rose-300 font-bold">0 to 2 months (simultaneous)</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2 px-3 font-semibold text-slate-200">4. AI Capex Disappointment</td>
                      <td className="py-2 px-3 text-slate-400">Mega-tech earnings and cloud capex falter</td>
                      <td className="py-2 px-3 text-slate-300">P/E ~21.5x</td>
                      <td className="py-2 px-3 text-red-300">Guidance cuts across 2+ hyperscalers</td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">1 to 3 months (market correction)</td>
                    </tr>
                    <tr className="hover:bg-slate-800/20">
                      <td className="py-2 px-3 font-semibold text-slate-200">5. Volatility Awakening</td>
                      <td className="py-2 px-3 text-slate-400">Options market reprices downside tail risks</td>
                      <td className="py-2 px-3 text-purple-400">15.52</td>
                      <td className="py-2 px-3 text-red-300">VIX surges and holds &gt; 25.0</td>
                      <td className="py-2 px-3 text-red-400 font-bold">Immediate (days to weeks)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Rules of Thumb for Everyday Investors */}
          <div className="rounded-lg border border-slate-800 bg-[#080d16] p-4">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>3 Golden Rules of Thumb for Everyday Investors</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
              <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2.5">
                <span className="font-bold text-amber-300 block mb-1">Rule 1: Don't Panic on Inversion</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The stock market often rallies 10–20% during the inversion. The real danger is the un-inversion when the curve steepens rapidly.
                </p>
              </div>
              <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2.5">
                <span className="font-bold text-amber-300 block mb-1">Rule 2: Watch Sahm Rule, Not Headlines</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Headline inflation can be sticky, but if the 3-month average unemployment rises 0.5% above its low (4.3%), recession is virtually certain.
                </p>
              </div>
              <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2.5">
                <span className="font-bold text-amber-300 block mb-1">Rule 3: Keep Cash Ready for Stage 4</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When VIX surges &gt; 25 and credit spreads widen, liquidity dries up. That is the time to deploy cash into high-quality assets at deep discounts.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#080d16] px-6 py-3">
          <span className="font-mono text-[11px] text-slate-500">
            Macro Intelligence Framework • Designed & Researched <strong className="text-amber-400">by Saud Aziz</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-slate-200 transition-colors"
          >
            Close Deep Dive
          </button>
        </div>
      </div>
    </div>
  );
};
