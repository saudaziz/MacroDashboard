import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopIntelligenceBar } from './TopIntelligenceBar';
import { HistoricalComparisonSidebar } from './HistoricalComparisonSidebar';
import { RecessionPlaybookModal } from './RecessionPlaybookModal';
import { RiskGauge } from './RiskGauge';

describe('MacroIntelligenceEnhancements', () => {
  it('renders TopIntelligenceBar with regime probability numbers and daily movers', () => {
    render(<TopIntelligenceBar riskScore={5.0} spread10Y2Y={0.48} icr={2.15} vix={15.52} />);

    expect(screen.getByText(/Regime Probability Gauge/i)).toBeInTheDocument();
    expect(screen.getByText(/Recession Probability: 28%/i)).toBeInTheDocument();
    expect(screen.getByText(/Soft Landing: 55%/i)).toBeInTheDocument();
    expect(screen.getByText(/Expansion: 17%/i)).toBeInTheDocument();
    expect(screen.getByText(/What Changed Since Yesterday:/i)).toBeInTheDocument();
    expect(screen.getByText(/Fed Funds/i)).toBeInTheDocument();
    expect(screen.getByText(/-5 bps/i)).toBeInTheDocument();
    expect(screen.getByText(/Gold Spot/i)).toBeInTheDocument();
    expect(screen.getByText(/\(\$4,132\/oz\)/i)).toBeInTheDocument();

    // Inline micro-definitions
    expect(screen.getByText(/GDP contraction & layoffs/i)).toBeInTheDocument();
    expect(screen.getByText(/Inflation cools without crash \(Baseline\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Reaccelerating growth & capex/i)).toBeInTheDocument();
  });

  it('toggles the Regime Probability explanation guide drawer in TopIntelligenceBar', () => {
    render(<TopIntelligenceBar riskScore={5.0} spread10Y2Y={0.48} icr={2.15} vix={15.52} />);

    // Guide drawer closed initially
    expect(screen.queryByText(/Understanding Macro Regime Probabilities/i)).not.toBeInTheDocument();

    // Click toggle button
    const toggleBtn = screen.getByRole('button', { name: /Toggle Regime Odds Interpretation Guide/i });
    fireEvent.click(toggleBtn);

    // Guide drawer is now open
    expect(screen.getByText(/Understanding Macro Regime Probabilities/i)).toBeInTheDocument();
    expect(screen.getByText(/Elevated Risk/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Modal Baseline/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Decision Rule/i)).toBeInTheDocument();
    expect(screen.getByText(/Sum: 100% \(100% distribution\)/i)).toBeInTheDocument();

    // Close using close button
    const closeBtn = screen.getByRole('button', { name: /Close guide/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Understanding Macro Regime Probabilities/i)).not.toBeInTheDocument();
  });

  it('renders HistoricalComparisonSidebar and toggles between Overlay and Sparklines', () => {
    render(<HistoricalComparisonSidebar />);

    expect(screen.getByText(/Historical Comparison: Last 3 Recessions/i)).toBeInTheDocument();
    expect(screen.getByText(/2001 \(Tech\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2008 \(GFC\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2020 \(COVID\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Now \(2025\/26\)/i)).toBeInTheDocument();
    expect(screen.getByText(/4.2% \(watch ≥ 4.3%\)/i)).toBeInTheDocument();

    // Toggle to sparklines
    const sparklinesBtn = screen.getByRole('button', { name: /Sparklines/i });
    fireEvent.click(sparklinesBtn);
    expect(screen.getByText(/2008 GFC: 5-Year Pre-Crash Pattern/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Cycle: 2021–2026 Trajectory/i)).toBeInTheDocument();
  });

  it('renders RecessionPlaybookModal with tightened stages, You Are Here indicator, and Timeline matrix', () => {
    const handleClose = vi.fn();
    render(<RecessionPlaybookModal isOpen={true} onClose={handleClose} />);

    // Stage 1 active indicator
    expect(screen.getByText(/YOU ARE HERE/i)).toBeInTheDocument();
    expect(screen.getByText(/Yield Un-Inversion/i)).toBeInTheDocument();

    // Tightened Stage 3 (matches both transmission card and catalyst matrix)
    const sahmElements = screen.getAllByText(/Sahm Rule Fires ⚠️/i);
    expect(sahmElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/~3 Mos to Layoffs/i)).toBeInTheDocument();

    // Timeline view default
    const timelineElements = screen.getAllByText(/Timeline Matrix/i);
    expect(timelineElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Immediate \(< 1 Mo\)/i)).toBeInTheDocument();

    // Switch to Reference Table
    const tableBtn = screen.getByRole('button', { name: /Reference Table/i });
    fireEvent.click(tableBtn);
    expect(screen.getByText(/Historical Lag to Recession/i)).toBeInTheDocument();
  });

  it('renders RiskGauge with dynamic risk tag labels for low, moderate, and crisis scores', () => {
    const { rerender } = render(<RiskGauge data={{ score: 5.0, summary: 'Moderate stress' }} />);
    expect(screen.getByText(/MODERATE RISK/i)).toBeInTheDocument();
    expect(screen.getByText(/YOU ARE HERE \(5\.0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Calm \/ Stable/i)).toBeInTheDocument();
    expect(screen.getByText(/Moderate \(Watch\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Crisis Tripwire/i)).toBeInTheDocument();

    rerender(<RiskGauge data={{ score: 8.5, summary: 'High systemic stress' }} />);
    expect(screen.getByText(/SYSTEMIC ALERT/i)).toBeInTheDocument();
    expect(screen.getByText(/YOU ARE HERE \(8\.5\)/i)).toBeInTheDocument();

    rerender(<RiskGauge data={{ score: 2.1, summary: 'Benign liquidity' }} />);
    expect(screen.getByText(/LOW RISK/i)).toBeInTheDocument();
    expect(screen.getByText(/YOU ARE HERE \(2\.1\)/i)).toBeInTheDocument();
  });

  it('supports legacy arc variant when specified', () => {
    render(<RiskGauge data={{ score: 5.0, summary: 'Moderate' }} variant="arc" />);
    expect(screen.getByText(/MODERATE RISK/i)).toBeInTheDocument();
    expect(screen.getByText(/5/i)).toBeInTheDocument();
  });
});
