import React from 'react';
import type { MarketEvent } from '../types';
import { COLORS } from '../theme';
import { Card, SectionTitle } from './UIAtoms';

export const EventsFeed: React.FC<{ events: MarketEvent[] }> = ({ events }) => {
  const mainEvent = events[0] || { title: "N/A", description: "No major events found.", potential_impact: "N/A" };

  return (
    <Card>
      <SectionTitle>Today's Legal & Market Event</SectionTitle>
      <div style={{
        background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}33`,
        borderRadius: 6, padding: "14px 16px", marginBottom: 12
      }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: COLORS.red, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          ⚠ {mainEvent.title}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>
          {mainEvent.description}
        </div>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: COLORS.muted, lineHeight: 1.7 }}>
        <strong style={{ color: COLORS.orange }}>POTENTIAL IMPACT:</strong><br />
        → {mainEvent.potential_impact}
      </div>
    </Card>
  );
};
