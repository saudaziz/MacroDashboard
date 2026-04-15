import React from 'react';
import type { MacroCalendar } from '../types';

export const Calendar: React.FC<{ data: MacroCalendar }> = ({ data }) => {
  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-blue-400">Macro Calendar & G7 Rates</h2>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="py-2">Event</th>
              <th className="py-2">Last Date</th>
              <th className="py-2">Next Date</th>
              <th className="py-2">Consensus</th>
            </tr>
          </thead>
          <tbody>
            {data.dates.map((d, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                <td className="py-2 font-medium">{d.event}</td>
                <td className="py-2">{d.last_date}</td>
                <td className="py-2 text-yellow-400">{d.next_date}</td>
                <td className="py-2 text-slate-400">{d.consensus || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="text-lg font-semibold mb-2 text-emerald-400">G7 Central Bank Guidance</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.rates.map((r, i) => (
          <div key={i} className="bg-slate-900/50 p-3 rounded border border-slate-700">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">{r.bank}</span>
              <span className="text-emerald-400 font-mono">{r.rate}</span>
            </div>
            <p className="text-xs text-slate-400 italic">{r.guidance}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
