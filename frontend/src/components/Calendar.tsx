import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import type { MacroCalendar } from '../types';
import { COLORS } from '../theme';
import { Card, SectionTitle, Tag } from './UIAtoms';

const CustomBarTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { bank: string }; value: number }> }) => {
  if (active && payload && payload.length > 0) {
    const first = payload[0];
    if (!first) {
      return null;
    }
    return (
      <div style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 12px" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.text }}>
          {first.payload.bank}: <span style={{ color: COLORS.amber }}>{first.value}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const Calendar: React.FC<{ data: MacroCalendar }> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<"calendar" | "economic">("calendar");

  // Helper to extract numeric rate for the chart
  const getNumericRate = (rateStr?: string) => {
    if (!rateStr) {
      return 0;
    }
    const match = rateStr.match(/(\d+(\.\d+)?)/);
    const numeric = match?.[1];
    return numeric ? parseFloat(numeric) : 0;
  };

  const rates = Array.isArray(data?.rates) ? data.rates : [];
  const dates = Array.isArray(data?.dates) ? data.dates : [];

  const chartData = rates.map(r => ({
    ...r,
    numericRate: getNumericRate(r.rate)
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* G7 Rates Chart */}
      <Card>
        <SectionTitle>G7 Policy Rates</SectionTitle>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} barSize={28} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={COLORS.border} strokeDasharray="3 3" />
            <XAxis 
              dataKey="bank" 
              tick={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fill: COLORS.muted }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: COLORS.muted }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={v => `${v}%`} 
              domain={[0, 'auto']} 
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: `${COLORS.amber}10` }} />
            <Bar dataKey="numericRate" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.numericRate >= 4 ? COLORS.orange : entry.numericRate >= 2 ? COLORS.amber : COLORS.cyan} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabbed List */}
      <Card style={{ flex: 1 }}>
        <SectionTitle>Market Data & Events</SectionTitle>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["calendar", "economic"] as const).map(t => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t)} 
              aria-pressed={activeTab === t}
              style={{
                padding: "4px 12px", borderRadius: 4, fontSize: 11,
                fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em",
                color: activeTab === t ? COLORS.amber : COLORS.muted,
                background: activeTab === t ? `${COLORS.amber}15` : "none",
                border: `1px solid ${activeTab === t ? COLORS.amberDim : COLORS.border}`,
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {t === "calendar" ? "Central Banks" : "Economic Data"}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }} aria-label={activeTab === 'calendar' ? 'Central bank rate table' : 'Economic events table'}>
            <thead>
              <tr>
                {activeTab === "calendar" ? (
                  ["Bank", "Current Rate", "Guidance"].map(h => (
                    <th key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: COLORS.muted, textAlign: "left", padding: "4px 8px", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                  ))
                ) : (
                  ["Event", "Next Date", "Consensus", "Signal"].map(h => (
                    <th key={h} style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: COLORS.muted, textAlign: "left", padding: "4px 8px", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {activeTab === "calendar" ? (
                rates.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                    <td style={{ padding: "10px 8px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.text, fontWeight: 500 }}>{row.bank}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <Tag color={COLORS.amber}>{row.rate}</Tag>
                    </td>
                    <td style={{ padding: "10px 8px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, lineHeight: 1.4 }}>{row.guidance}</td>
                  </tr>
                ))
              ) : (
                dates.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                    <td style={{ padding: "10px 8px", fontFamily: "'DM Mono', monospace", fontSize: 12, color: COLORS.text, fontWeight: 500 }}>{row.event}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <Tag color={COLORS.cyan}>{row.next_date}</Tag>
                    </td>
                    <td style={{ padding: "10px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.muted }}>{row.consensus || 'N/A'}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted }}>{row.signal || row.actual || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
