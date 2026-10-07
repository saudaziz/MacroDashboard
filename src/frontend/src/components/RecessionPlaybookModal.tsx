import React, { useEffect } from 'react';
import { X, ShieldAlert, ArrowRight, BookOpen, Clock, Activity, CheckCircle2 } from 'lucide-react';

interface RecessionPlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecessionPlaybookModal: React.FC<RecessionPlaybookModalProps> = ({ isOpen, onClose }) => {
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
                Authored by Saud Aziz • How an un-inverting yield curve transitions into real economic pullbacks, what catalysts to watch today, and historical lag horizons.
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
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-amber-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-amber-400">
                1. The Transmission Chain: How an Un-Inversion Becomes a Recession
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-cyan-400 uppercase font-bold mb-1">Stage 1 (Today)</div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Yield Un-Inversion</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    10Y-2Y spread steepens to <span className="font-mono text-cyan-300 font-semibold">+0.48%</span> as the Fed starts cutting rates (<span className="font-mono">3.75%-4.00%</span>).
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-cyan-400/80 border-t border-cyan-900/50 pt-2">
                  <span>Starter Pistol</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-amber-400 uppercase font-bold mb-1">Stage 2 (Refinancing)</div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Debt Wall Crunch</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Mid-caps face 7-9% refinancing on 2021 low-rate loans. Mid-cap ICR at <span className="font-mono text-amber-300 font-semibold">2.15x</span>; defaults rise if ICR &lt; 1.8x.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-amber-400/80 border-t border-amber-900/50 pt-2">
                  <span>Lag: 2–4 Mos</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-rose-400 uppercase font-bold mb-1">Stage 3 (Labor Cracks)</div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Sahm Rule Fires</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Unemployment rises from 4.0% to <span className="font-mono text-rose-300 font-semibold">≥ 4.3%</span>. Corporate hiring freezes turn into broad layoffs.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-rose-400/80 border-t border-rose-900/50 pt-2">
                  <span>Lag: 0–2 Mos</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-3 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-[10px] text-red-400 uppercase font-bold mb-1">Stage 4 (Market Reset)</div>
                  <div className="font-bold text-slate-100 text-sm mb-1">VIX & Earnings Shock</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Mega-cap AI capex fails or growth slows. Volatility wakes up (<span className="font-mono text-red-300 font-semibold">VIX &gt; 25</span>); liquidity contracts.
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
                    <td className="py-2 px-3 text-amber-400 font-bold">3.88%</td>
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
                    <td className="py-2 px-3 text-amber-400 font-bold">4.0%</td>
                    <td className="py-2 px-3 text-slate-400">3.5% – 4.2%</td>
                    <td className="py-2 px-3 text-red-400 font-bold">≥ 4.3% – 4.5%</td>
                    <td className="py-2 px-3"><span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold">Tripwire Watch</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Shock Catalysts & Historical Lags Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-cyan-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-cyan-400">
                3. Shock Catalysts & Historical Countdown Horizons
              </h3>
            </div>
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
                    <td className="py-2 px-3 text-amber-400">4.0%</td>
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
          </div>

          {/* Section 4: Rules of Thumb for Everyday Investors */}
          <div className="rounded-lg border border-slate-800 bg-[#080d16] p-4">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>3 Golden Rules of Thumb for Everyday Investors</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300">
              <div className="rounded bg-[#0d1420] p-2.5 border border-slate-800/60">
                <span className="font-bold text-slate-100">Rule 1: Don't panic on inversion, prepare on un-inversion.</span>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Inversions can last 18-24 months while stocks rally. The danger starts when the curve steepens back to positive territory.
                </p>
              </div>
              <div className="rounded bg-[#0d1420] p-2.5 border border-slate-800/60">
                <span className="font-bold text-slate-100">Rule 2: Watch unemployment and credit, not headlines.</span>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  If unemployment stays under 4.3% and high-yield spreads remain below 400 bps, the recession is not imminent.
                </p>
              </div>
              <div className="rounded bg-[#0d1420] p-2.5 border border-slate-800/60">
                <span className="font-bold text-slate-100">Rule 3: Cash & Treasuries are offensive weapons.</span>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Earning ~4-5% risk-free in short Treasuries gives you guaranteed income and dry powder to buy market dips when panic arrives.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#080d16] px-6 py-3 font-mono text-[10px] text-slate-500">
          <div>
            <span className="text-amber-400 font-semibold">Macro Risk Framework by Saud Aziz</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>Sources: Federal Reserve Economic Data (FRED), NBER Business Cycle Dating, ICE Data Indices</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
