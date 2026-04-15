import React from 'react';
import type { RiskSentiment } from '../types';
import { AlertTriangle, TrendingDown, ShieldCheck } from 'lucide-react';

export const RiskGauge: React.FC<{ data: RiskSentiment }> = ({ data }) => {
  const getScoreColor = (score: number) => {
    if (score < 4) return 'text-emerald-400';
    if (score < 7) return 'text-yellow-400';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score < 4) return 'bg-emerald-400/20 border-emerald-400/50';
    if (score < 7) return 'bg-yellow-400/20 border-yellow-400/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  return (
    <div className={`p-6 rounded-lg border-2 shadow-xl ${getScoreBg(data.score)} mb-6`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            Risk Sentiment Score: <span className={getScoreColor(data.score)}>{data.score}/10</span>
          </h2>
          <p className="text-slate-200 mt-2 italic text-lg">{data.summary}</p>
        </div>
        <div className="text-5xl">
          {data.score >= 8 ? <AlertTriangle className="text-red-500 w-12 h-12" /> : 
           data.score >= 5 ? <TrendingDown className="text-yellow-400 w-12 h-12" /> : 
           <ShieldCheck className="text-emerald-400 w-12 h-12" />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-slate-900/60 p-4 rounded-md border border-slate-700">
          <h3 className="font-bold text-blue-400 mb-2">Contagion Analysis</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{data.contagion_analysis}</p>
        </div>

        {data.score >= 8 && (
          <div className="bg-red-900/40 p-4 rounded-md border border-red-500/50 animate-pulse-slow">
            <h3 className="font-bold text-red-200 mb-2 flex items-center gap-1">
              <AlertTriangle size={16} /> SAFE HAVEN DEEP-DIVE
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-semibold text-yellow-300">Gold Levels:</span>
                <p className="text-slate-300">{data.gold_technical || 'N/A'}</p>
              </div>
              <div>
                <span className="font-semibold text-blue-300">USD Strength:</span>
                <p className="text-slate-300">{data.usd_technical || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-200 italic border-t border-red-500/30 pt-2 mt-2">
                  {data.safe_haven_analysis}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
