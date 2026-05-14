import React from 'react';
import type { RiskSentiment } from '../types';
import { COLORS } from '../theme';
import { Tag } from './UIAtoms';

export const RiskGauge: React.FC<{ data: RiskSentiment }> = ({ data }) => {
  const score = data.score;
  const pct = (score / 10) * 100;
  const color = score >= 8 ? COLORS.red : score >= 6 ? COLORS.orange : COLORS.amber;
  
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} role="img" aria-label={`Systemic risk score ${score} out of 10`}>
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
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color, letterSpacing: "0.02em" }}>{score}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.muted }}>/10</span>
        </div>
      </div>
      <Tag color={color}>SYSTEMIC ALERT</Tag>
    </div>
  );
};
