import React from 'react';
import type { PortfolioAllocation } from '../types';
import { COLORS } from '../theme';
import { Card, SectionTitle, Tag } from './UIAtoms';

export const PortfolioAdvice: React.FC<{ suggestions: PortfolioAllocation[], risks: string[] }> = ({ suggestions, risks }) => {
  return (
    <Card style={{ border: `1px solid ${COLORS.amber}44` }}>
      <SectionTitle>Actionable Allocation</SectionTitle>
      {suggestions.map((s, i) => (
        <div key={i} style={{
          display: "flex", gap: 12, marginBottom: 14,
          paddingBottom: 14, borderBottom: i < suggestions.length - 1 ? `1px solid ${COLORS.border}` : "none"
        }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <Tag color={i % 2 === 0 ? COLORS.green : COLORS.amber}>
              {i === 0 ? "STRATEGIC" : i === 1 ? "TACTICAL" : "SCREEN"}
            </Tag>
          </div>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: i % 2 === 0 ? COLORS.green : COLORS.amber, marginBottom: 4 }}>
              {s.asset_class} — {s.percentage}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
              {s.rationale}
            </div>
          </div>
        </div>
      ))}
      {risks.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.red, textTransform: "uppercase", marginBottom: 4 }}>Risk Mitigation</div>
          {risks.map((r, i) => (
            <div key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.muted, marginBottom: 2 }}>
              → {r}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
