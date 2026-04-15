import React from 'react';
import type { PortfolioAllocation } from '../types';
import { Briefcase, Target, ShieldCheck } from 'lucide-react';

export const PortfolioAdvice: React.FC<{ suggestions: PortfolioAllocation[], risks: string[] }> = ({ suggestions, risks }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 mb-12">
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg border-t-4 border-emerald-500">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-emerald-400">
          <Briefcase size={24} /> Actionable Portfolio Allocation
        </h2>
        <div className="space-y-4">
          {suggestions.map((s, i) => (
            <div key={i} className="flex justify-between items-start gap-4 p-4 bg-slate-900/40 rounded border border-slate-700">
              <div className="flex-1">
                <h3 className="font-bold text-slate-100">{s.asset_class}</h3>
                <p className="text-xs text-slate-400 mt-1">{s.rationale}</p>
              </div>
              <div className="text-xl font-mono font-black text-emerald-400 min-w-[60px] text-right">
                {s.percentage}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg shadow-lg border-t-4 border-blue-500">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400">
          <ShieldCheck size={24} /> Risk Mitigation Steps
        </h2>
        <ul className="space-y-4">
          {risks.map((r, i) => (
            <li key={i} className="flex gap-3 items-start p-3 bg-slate-900/40 rounded border border-slate-700">
              <div className="mt-1">
                <Target size={18} className="text-blue-500" />
              </div>
              <span className="text-sm text-slate-200">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
