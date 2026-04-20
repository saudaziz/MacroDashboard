import React from 'react';
import { COLORS } from '../theme';

export const Tag: React.FC<{ children: React.ReactNode, color: string, style?: React.CSSProperties }> = ({ children, color, style = {} }) => (
  <span style={{
    background: `${color}22`, color, border: `1px solid ${color}44`,
    borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "monospace",
    letterSpacing: "0.05em", fontWeight: 700, whiteSpace: "nowrap", ...style
  }}>
    {children}
  </span>
);

export const Card: React.FC<{ children: React.ReactNode, style?: React.CSSProperties, className?: string }> = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{
    background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, padding: "20px 24px", ...style
  }}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.15em",
    color: COLORS.muted, textTransform: "uppercase", marginBottom: 16,
    borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 8
  }}>
    {children}
  </div>
);

export const MetricBig: React.FC<{ label: string, value: string | number, unit?: string, color?: string, sub?: string }> = ({ label, value, unit, color = COLORS.amber, sub }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color, letterSpacing: "0.02em", lineHeight: 1 }}>{value}</span>
      {unit && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.muted }}>{unit}</span>}
    </div>
    {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: COLORS.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);
