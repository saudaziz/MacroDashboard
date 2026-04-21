import React from 'react';
import type { CreditHealth } from '../types';
import { COLORS, riskColor } from '../theme';
import { Card, SectionTitle, Tag } from './UIAtoms';

export const CreditPanel: React.FC<{ data: CreditHealth }> = ({ data }) => {
  const sectoralBreakdown = Array.isArray(data?.sectoral_breakdown) ? data.sectoral_breakdown : [];
  const watchlist = Array.isArray(data?.watchlist) ? data.watchlist : [];

  const metrics = [
    { label: 'PIK Debt Issuance', value: data?.pik_debt_issuance || 'N/A', color: COLORS.amber },
    { label: 'CRE Delinquency', value: data?.cre_delinquency_rate || 'N/A', color: COLORS.red },
    { label: 'Mid-Cap HY OAS', value: data?.mid_cap_hy_oas || 'N/A', color: COLORS.orange },
    { label: 'CP Spreads', value: data?.cp_spreads || 'N/A', color: COLORS.orange }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Systemic Stress Indicators */}
      <Card>
        <SectionTitle>Systemic Credit Stress Indicators</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{
              background: COLORS.bg, 
              border: `1px solid ${m.color}33`,
              borderLeft: `3px solid ${m.color}`,
              borderRadius: 6, padding: "14px 16px"
            }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: m.color, letterSpacing: "0.02em" }}>
                {typeof m.value === 'object' ? JSON.stringify(m.value) : (m.value || 'N/A')}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Sector ICR Breakdown */}
      <Card style={{ flex: 1 }}>
        <SectionTitle>Mid-Cap ICR Sector Breakdown</SectionTitle>
        <div style={{ marginBottom: 16 }}>
          {sectoralBreakdown.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.text }}>{s.sector}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: riskColor(s.average_icr < 1.5 ? "CRITICAL" : "OK"), fontWeight: 600 }}>{s.average_icr.toFixed(2)}x</span>
                  <Tag color={riskColor(s.average_icr < 1.5 ? "CRITICAL" : "OK")}>
                    {s.average_icr < 1.5 ? "DISTRESSED" : "STABLE"}
                  </Tag>
                </div>
              </div>
              <div style={{ height: 4, background: COLORS.ghost, borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${Math.min((s.average_icr / 3) * 100, 100)}%`,
                  background: riskColor(s.average_icr < 1.5 ? "CRITICAL" : "OK"), borderRadius: 2,
                  transition: "width 1s ease"
                }} />
              </div>
            </div>
          ))}
        </div>

        <SectionTitle>High-Risk Watchlist (ICR &lt; 1.2x)</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Firm", "ICR", "CDS", "Activity"].map(h => (
                  <th key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: COLORS.muted, textAlign: "left", padding: "4px 6px", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {watchlist.map((d, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                  <td style={{ padding: "8px 6px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.text }}>{d.firm_name}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <Tag color={COLORS.red}>{d.icr.toFixed(2)}x</Tag>
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.muted }}>{d.cds_pricing}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.muted }}>{d.insider_selling}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
