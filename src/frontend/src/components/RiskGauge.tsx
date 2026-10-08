import React from 'react';
import type { RiskSentiment } from '../types';
import { COLORS } from '../theme';
import { Tag } from './UIAtoms';

export interface RiskGaugeProps {
  data: RiskSentiment;
  tagLabel?: string;
  variant?: 'linear' | 'arc';
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ data, tagLabel, variant = 'linear' }) => {
  const score = Number(data?.score ?? 0);
  const clampedScore = Math.max(0, Math.min(10, score));
  const pct = (clampedScore / 10) * 100;

  // Level classification:
  // 0.0 – 3.9: Low / Stable
  // 4.0 – 6.9: Moderate / Watch
  // 7.0 – 10.0: High / Crisis Alert
  const isCrisis = clampedScore >= 7.0;
  const isModerate = clampedScore >= 4.0 && clampedScore < 7.0;
  const color = isCrisis ? COLORS.red : isModerate ? COLORS.amber : COLORS.green;
  const displayTag = tagLabel ?? (isCrisis ? 'SYSTEMIC ALERT' : isModerate ? 'MODERATE RISK' : 'LOW RISK');

  if (variant === 'arc') {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} role="img" aria-label={`Systemic risk score ${clampedScore} out of 10`}>
        <div style={{ position: "relative", width: 120, height: 82 }}>
          <svg width="120" height="82" viewBox="0 0 120 82">
            <path 
              d="M 10 66 A 55 55 0 0 1 110 66" 
              stroke={COLORS.ghost} 
              strokeWidth="10" 
              fill="none" 
              strokeLinecap="round" 
            />
            <path
              d="M 10 66 A 55 55 0 0 1 110 66"
              stroke={color} 
              strokeWidth="10" 
              fill="none" 
              strokeLinecap="round" 
              strokeDasharray={`${(pct / 100) * 172.8} 172.8`}
            />
          </svg>
          <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color, letterSpacing: "0.02em" }}>{clampedScore}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.muted }}>/10</span>
          </div>
        </div>
        <Tag color={color}>{displayTag}</Tag>
      </div>
    );
  }

  // Linear multi-level bar scale with level points and "YOU ARE HERE" pin indicator
  return (
    <div className="w-full flex flex-col gap-2 pt-1" role="img" aria-label={`Systemic risk score ${clampedScore.toFixed(1)} out of 10`}>
      {/* Top score headline */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className="text-2xl font-bold font-mono tracking-tight"
            style={{ color }}
          >
            {clampedScore.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-500">/ 10.0</span>
          <span className="text-xs text-slate-400 font-sans hidden sm:inline">
            • {isCrisis ? 'Elevated Systemic Strain' : isModerate ? 'Moderate Financial Stress' : 'Benign Financial Conditions'}
          </span>
        </div>
        <Tag color={color}>{displayTag}</Tag>
      </div>

      {/* Linear Track Container with Indicator Pin */}
      <div className="relative pt-6 pb-1">
        {/* "YOU ARE HERE" Pin Indicator on Linear Bar */}
        <div
          className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-500"
          style={{ left: `${Math.max(3, Math.min(97, pct))}%` }}
        >
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border shadow-md whitespace-nowrap"
            style={{
              backgroundColor: `${color}25`,
              borderColor: `${color}80`,
              color: color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
            <span>YOU ARE HERE ({clampedScore.toFixed(1)})</span>
          </div>
          <div
            className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px]"
            style={{ borderTopColor: color }}
          />
        </div>

        {/* Segmented Horizontal Bar for 3 Level Zones */}
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-950 border border-slate-800 shadow-inner">
          {/* Level 1: 0.0 – 3.9 (40%) Calm / Stable */}
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 opacity-90 transition-all duration-500"
            style={{ width: '40%' }}
            title="0.0 – 3.9: Calm / Stable Zone"
          />
          {/* Level 2: 4.0 – 6.9 (30%) Moderate / Watch */}
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 opacity-90 transition-all duration-500 border-l border-r border-slate-950"
            style={{ width: '30%' }}
            title="4.0 – 6.9: Moderate / Watch Zone"
          />
          {/* Level 3: 7.0 – 10.0 (30%) High / Crisis Alert */}
          <div
            className="h-full bg-gradient-to-r from-rose-600 to-rose-500 opacity-90 transition-all duration-500"
            style={{ width: '30%' }}
            title="7.0 – 10.0: High / Crisis Zone"
          />
        </div>

        {/* Level Points & Threshold Ticks under the Bar */}
        <div className="relative w-full flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-0.5">
          {/* Point 0.0 */}
          <div className="flex flex-col items-start">
            <span className="text-slate-400 font-bold">0.0</span>
            <span className="text-[9px] text-emerald-400/90 font-sans">Calm / Stable</span>
          </div>

          {/* Point 4.0 Marker */}
          <div className="absolute left-[40%] -translate-x-1/2 flex flex-col items-center text-center">
            <span className="text-slate-400 font-bold">4.0</span>
            <span className="text-[9px] text-amber-400/90 font-sans">Moderate (Watch)</span>
          </div>

          {/* Point 7.0 Marker */}
          <div className="absolute left-[70%] -translate-x-1/2 flex flex-col items-center text-center">
            <span className="text-slate-400 font-bold">7.0</span>
            <span className="text-[9px] text-rose-400/90 font-sans">Crisis Tripwire</span>
          </div>

          {/* Point 10.0 */}
          <div className="flex flex-col items-end">
            <span className="text-slate-400 font-bold">10.0</span>
            <span className="text-[9px] text-rose-500 font-sans">Severe Freeze</span>
          </div>
        </div>
      </div>
    </div>
  );
};
