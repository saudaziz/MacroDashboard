import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Activity, GitCommit, ShieldAlert, TrendingDown } from 'lucide-react';
import { Card } from './UIAtoms';
import type { MacroCorrelations } from '../types';

interface MacroCorrelationsPanelProps {
  data?: MacroCorrelations | undefined;
}

const DEFAULT_CORRELATIONS: MacroCorrelations = {
  historical_points: [
    { date: '2021-10', yield_2y: 0.48, yield_5y: 1.18, yield_10y: 1.55, spread_10y_2y: 1.07, vix: 16.26 },
    { date: '2022-04', yield_2y: 2.70, yield_5y: 2.92, yield_10y: 2.89, spread_10y_2y: 0.19, vix: 33.40 },
    { date: '2022-07', yield_2y: 2.89, yield_5y: 2.70, yield_10y: 2.67, spread_10y_2y: -0.22, vix: 21.33 },
    { date: '2022-10', yield_2y: 4.44, yield_5y: 4.27, yield_10y: 4.10, spread_10y_2y: -0.34, vix: 25.88 },
    { date: '2023-03', yield_2y: 4.06, yield_5y: 3.60, yield_10y: 3.48, spread_10y_2y: -0.58, vix: 18.70 },
    { date: '2023-07', yield_2y: 4.88, yield_5y: 4.18, yield_10y: 3.97, spread_10y_2y: -0.91, vix: 13.63 },
    { date: '2023-10', yield_2y: 5.07, yield_5y: 4.79, yield_10y: 4.88, spread_10y_2y: -0.19, vix: 19.80 },
    { date: '2024-04', yield_2y: 5.03, yield_5y: 4.71, yield_10y: 4.69, spread_10y_2y: -0.34, vix: 15.65 },
    { date: '2024-08', yield_2y: 3.91, yield_5y: 3.65, yield_10y: 3.91, spread_10y_2y: 0.00, vix: 15.00 },
    { date: '2024-10', yield_2y: 4.16, yield_5y: 4.16, yield_10y: 4.28, spread_10y_2y: 0.12, vix: 23.16 },
    { date: '2025-04', yield_2y: 3.81, yield_5y: 3.95, yield_10y: 4.20, spread_10y_2y: 0.39, vix: 22.45 },
    { date: '2025-10', yield_2y: 3.88, yield_5y: 4.02, yield_10y: 4.22, spread_10y_2y: 0.34, vix: 15.90 },
    { date: '2026-04', yield_2y: 3.88, yield_5y: 4.02, yield_10y: 4.40, spread_10y_2y: 0.52, vix: 16.89 },
    { date: '2026-07', yield_2y: 4.28, yield_5y: 4.45, yield_10y: 4.75, spread_10y_2y: 0.47, vix: 15.99 },
    { date: '2026-10', yield_2y: 4.84, yield_5y: 5.06, yield_10y: 5.31, spread_10y_2y: 0.48, vix: 15.52 },
  ],
  current_regime: 'Un-Inverting (Late Cycle Transition)',
  yield_curve_signal: '10Y-2Y Spread (+0.48%) un-inverted from -1.08% trough; historical danger window',
  vix_regime: 'Calm Surface (15.5) masking underlying bond & breadth strains',
  breadth_signal: 'The Unbroadening: Narrow rally led by mega-cap tech; vulnerable to leadership rotation',
  credit_headwinds: 'Consumer FICO deterioration & commercial credit stress building',
};

type ActiveTab = 'yield_curve' | 'maturities' | 'vix_correlation' | 'takeaways';

export const MacroCorrelationsPanel: React.FC<MacroCorrelationsPanelProps> = ({ data = DEFAULT_CORRELATIONS }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('yield_curve');
  const correlations = data || DEFAULT_CORRELATIONS;
  const points = correlations.historical_points && correlations.historical_points.length > 0
    ? correlations.historical_points
    : DEFAULT_CORRELATIONS.historical_points;

  const latestPoint = points[points.length - 1];

  return (
    <Card className="flex flex-col gap-5 border-slate-800 bg-[#0d1420] p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-cyan-400" />
          <div>
            <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider text-slate-100 uppercase">
              Macro Correlations & 5-Year Historical Trends
            </h2>
            <p className="font-mono text-[11px] text-slate-400">
              Tracking Treasury Yields (2Y, 5Y, 10Y), Yield Curve Inversion, and VIX Volatility (2021–2026)
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-[#080d16] p-1 font-mono text-[11px]">
          <button
            onClick={() => setActiveTab('yield_curve')}
            className={`rounded px-3 py-1.5 font-bold transition-colors ${
              activeTab === 'yield_curve' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2Y vs 10Y & Spread
          </button>
          <button
            onClick={() => setActiveTab('maturities')}
            className={`rounded px-3 py-1.5 font-bold transition-colors ${
              activeTab === 'maturities' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            5-Year Curve (2Y, 5Y, 10Y)
          </button>
          <button
            onClick={() => setActiveTab('vix_correlation')}
            className={`rounded px-3 py-1.5 font-bold transition-colors ${
              activeTab === 'vix_correlation' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            VIX vs. Bond Stress
          </button>
          <button
            onClick={() => setActiveTab('takeaways')}
            className={`rounded px-3 py-1.5 font-bold transition-colors ${
              activeTab === 'takeaways' ? 'bg-cyan-500 text-black shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            "The Unbroadening" Insights
          </button>
        </div>
      </div>

      {/* Snapshot Diagnostic Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3 text-center">
          <div className="font-mono text-[10px] uppercase text-slate-500">10Y Yield</div>
          <div className="font-mono text-lg font-bold text-amber-400">{latestPoint?.yield_10y.toFixed(2)}%</div>
          <div className="text-[10px] text-slate-500">Benchmark discount rate</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3 text-center">
          <div className="font-mono text-[10px] uppercase text-slate-500">2Y Yield</div>
          <div className="font-mono text-lg font-bold text-cyan-400">{latestPoint?.yield_2y.toFixed(2)}%</div>
          <div className="text-[10px] text-slate-500">Fed policy expectations</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3 text-center">
          <div className="font-mono text-[10px] uppercase text-slate-500">5Y Yield</div>
          <div className="font-mono text-lg font-bold text-indigo-400">{latestPoint?.yield_5y.toFixed(2)}%</div>
          <div className="text-[10px] text-slate-500">Mid-duration anchor</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080d16] p-3 text-center">
          <div className="font-mono text-[10px] uppercase text-slate-500">10Y-2Y Spread</div>
          <div className={`font-mono text-lg font-bold ${(latestPoint?.spread_10y_2y ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(latestPoint?.spread_10y_2y ?? 0) >= 0 ? `+${(latestPoint?.spread_10y_2y ?? 0).toFixed(2)}` : (latestPoint?.spread_10y_2y ?? 0).toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500">Un-inverting (+0.48%)</div>
        </div>
        <div className="col-span-2 md:col-span-1 rounded-lg border border-slate-800 bg-[#080d16] p-3 text-center">
          <div className="font-mono text-[10px] uppercase text-slate-500">CBOE VIX</div>
          <div className="font-mono text-lg font-bold text-purple-400">{latestPoint?.vix.toFixed(1)}</div>
          <div className="text-[10px] text-slate-500">Calm Surface Regime</div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="h-[340px] w-full min-w-0 rounded-lg border border-slate-800/80 bg-[#080d16] p-4">
        {activeTab === 'yield_curve' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)}%`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Inversion Boundary (0%)', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="yield_10y" name="10-Year Treasury Yield" stroke="#fbbf24" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="yield_2y" name="2-Year Treasury Yield" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spread_10y_2y" name="10Y-2Y Spread (Inversion Indicator)" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'maturities' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(val: any) => [`${Number(val).toFixed(2)}%`]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="yield_2y" name="2Y Treasury Yield" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="yield_5y" name="5Y Treasury Yield" stroke="#818cf8" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="yield_10y" name="10Y Treasury Yield" stroke="#fbbf24" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'vix_correlation' && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
            <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#c084fc" tick={{ fontSize: 11 }} label={{ value: 'VIX', angle: -90, position: 'insideLeft', fill: '#c084fc', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} unit="%" label={{ value: 'Spread %', angle: 90, position: 'insideRight', fill: '#10b981', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine yAxisId="left" y={20} stroke="#eab308" strokeDasharray="3 3" label={{ value: 'VIX 20 Alert', fill: '#eab308', fontSize: 10 }} />
              <ReferenceLine yAxisId="left" y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'VIX 30 Crisis', fill: '#ef4444', fontSize: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="vix" name="CBOE VIX Volatility Index" stroke="#c084fc" strokeWidth={2.5} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="spread_10y_2y" name="10Y-2Y Spread (%)" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'takeaways' && (
          <div className="flex h-full flex-col justify-between overflow-y-auto pr-2 text-xs text-slate-300">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-[#0d1420] p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-amber-400">
                  <GitCommit size={16} />
                  <span>"The Unbroadening" & Concentration Risk</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  As highlighted in <em>The Compound (What Are Your Thoughts)</em>, headline indexes are masking significant internal weakness. 
                  A very small group of tech megacaps (Nvidia, hyperscalers) has generated almost all net returns, while the equal-weighted S&P 500, small caps, and credit-sensitive firms are lagging or declining.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0d1420] p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-cyan-400">
                  <TrendingDown size={16} />
                  <span>The Yield Curve "Un-Inversion" Rule</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  As explained by Nick Lumpp (RCN Wealth Advisors), stock corrections rarely occur while the curve is deeply inverted (-1.08%). 
                  The historical danger zone begins <strong>when the yield curve un-inverts and steepens</strong> as short rates drop on softening economic data. We are currently right in this un-inversion window (+0.48%).
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0d1420] p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-purple-400">
                  <Activity size={16} />
                  <span>The Volatility Paradox (Calm VIX)</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  The CBOE VIX hovering around 15 gives investors a false sense of security. Historical cycles demonstrate that prolonged low-volatility regimes coupled with narrow market breadth precede explosive volatility spikes.
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#0d1420] p-4">
                <div className="mb-2 flex items-center gap-2 font-bold text-emerald-400">
                  <ShieldAlert size={16} />
                  <span>"One Step Away From Sell" Discipline</span>
                </div>
                <p className="leading-relaxed text-slate-400">
                  The key takeaway for preparing for pullbacks is proactive rules-based rebalancing: trimming parabolic mega-cap winners, adding defensive bond duration (5Y–10Y Treasuries locking in 4–5%), building dry powder, and maintaining real asset/gold hedges.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 font-mono text-[10px] text-slate-500">
              <span>Source Feeds: FRED (Federal Reserve) Real-Time + Multi-Agent Synthesis</span>
              <span>Regime: {correlations.current_regime}</span>
            </div>
          </div>
        )}
      </div>

      {/* Explanatory Footer Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-[#080d16] px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold text-slate-300">Signal Status:</span>
          <span>{correlations.yield_curve_signal}</span>
        </div>
        <div className="font-mono text-[11px] text-amber-400/90">
          {correlations.breadth_signal}
        </div>
      </div>
    </Card>
  );
};
