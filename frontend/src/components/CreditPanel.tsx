import React from 'react';
import type { CreditHealth } from '../types';
import { AlertCircle, Landmark } from 'lucide-react';

export const CreditPanel: React.FC<{ data: CreditHealth }> = ({ data }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-rose-400">
          <Landmark size={24} /> Credit & Mid-Cap Health
        </h2>
        {data.alert && (
          <div className="bg-rose-500/20 text-rose-500 px-3 py-1 rounded-full text-xs font-bold border border-rose-500/50 flex items-center gap-1 animate-pulse">
            <AlertCircle size={14} /> ICR ALERT
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/40 p-4 rounded border border-slate-700">
          <span className="text-slate-400 text-sm">Avg Mid-Cap ICR</span>
          <p className={`text-2xl font-mono font-bold mt-1 ${data.mid_cap_avg_icr < 1.5 ? 'text-rose-500' : 'text-emerald-400'}`}>
            {data.mid_cap_avg_icr.toFixed(2)}x
          </p>
        </div>
        <div className="bg-slate-900/40 p-4 rounded border border-slate-700 col-span-2">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {data.sectoral_breakdown.map((s, i) => (
              <div key={i} className="min-w-[120px] border-r border-slate-700/50 last:border-0 pr-4">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{s.sector}</span>
                <p className={`text-sm font-mono mt-1 ${s.average_icr < 1.5 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {s.average_icr.toFixed(2)}x
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'PIK Debt', val: data.pik_debt_issuance },
          { label: 'CRE Delinq.', val: data.cre_delinquency_rate },
          { label: 'HY OAS', val: data.mid_cap_hy_oas },
          { label: 'CP Spreads', val: data.cp_spreads },
          { label: 'CDX (VIX-C)', val: data.vix_of_credit_cdx }
        ].map((m, i) => (
          <div key={i} className="bg-slate-900/30 p-2 rounded border border-slate-700/50 text-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase block">{m.label}</span>
            <span className="text-xs font-mono text-slate-300 block mt-1">{m.val}</span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-widest">High-Risk Watchlist (ICR &lt; 1.2x)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="pb-2 text-left">Firm</th>
                <th className="pb-2 text-left">Debt Load</th>
                <th className="pb-2 text-left">ICR</th>
                <th className="pb-2 text-left">Insider Activity</th>
                <th className="pb-2 text-left">CDS Pricing</th>
              </tr>
            </thead>
            <tbody>
              {data.watchlist.map((f, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  <td className="py-2 font-bold">{f.firm_name}</td>
                  <td className="py-2 text-slate-400 font-mono">{f.debt_load}</td>
                  <td className="py-2 text-rose-400 font-mono">{f.icr.toFixed(2)}x</td>
                  <td className="py-2 italic text-slate-300">{f.insider_selling}</td>
                  <td className="py-2 text-slate-400 font-mono">{f.cds_pricing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
