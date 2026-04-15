import React from 'react';
import type { MarketEvent } from '../types';
import { Globe, Scale, Droplets, Zap } from 'lucide-react';

export const EventsFeed: React.FC<{ events: MarketEvent[] }> = ({ events }) => {
  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('court') || t.includes('legal')) return <Scale className="text-purple-400" size={20} />;
    if (t.includes('oil') || t.includes('energy')) return <Droplets className="text-amber-400" size={20} />;
    if (t.includes('supply')) return <Zap className="text-yellow-400" size={20} />;
    return <Globe className="text-blue-400" size={20} />;
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-6 text-purple-400">Major Market & Legal Events</h2>
      <div className="space-y-6">
        {events.map((e, i) => (
          <div key={i} className="flex gap-4 p-4 bg-slate-900/40 rounded border border-slate-700 hover:border-purple-500/50 transition-colors">
            <div className="mt-1">{getIcon(e.title)}</div>
            <div>
              <h3 className="font-bold text-slate-100">{e.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{e.description}</p>
              <div className="mt-3 p-2 bg-slate-900/60 rounded border-l-2 border-purple-500">
                <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">Potential Market Impact</span>
                <p className="text-xs italic text-slate-300">{e.potential_impact}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
