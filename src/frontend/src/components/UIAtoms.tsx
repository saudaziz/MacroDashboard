import React from 'react';
import { Info } from 'lucide-react';
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

export const MetricBig: React.FC<{ label: string, value: string | number, unit?: string, color?: string, sub?: string | undefined, helpText?: string }> = ({ label, value, unit, color = COLORS.amber, sub, helpText }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      {helpText && (
        <button
          type="button"
          aria-label={`${label} explanation`}
          aria-describedby={`${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tooltip`}
          className="group"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            border: 0,
            padding: 0,
            background: "transparent",
            color: COLORS.muted,
            cursor: "help",
          }}
        >
          <Info size={12} />
          <span
            id={`${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tooltip`}
            role="tooltip"
            className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-64 -translate-x-1/2 rounded border border-slate-700 bg-[#0d1420] px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-slate-200 shadow-xl shadow-black/40 group-hover:block group-focus:block group-focus-visible:block"
          >
            {helpText}
          </span>
        </button>
      )}
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color, letterSpacing: "0.02em", lineHeight: 1 }}>{value}</span>
      {unit && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: COLORS.muted }}>{unit}</span>}
    </div>
    {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.45, color: COLORS.muted, marginTop: 6 }}>{sub}</div>}
  </div>
);
