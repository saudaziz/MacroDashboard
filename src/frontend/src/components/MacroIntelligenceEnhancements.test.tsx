import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopIntelligenceBar } from './TopIntelligenceBar';
import { HistoricalComparisonSidebar } from './HistoricalComparisonSidebar';
import { RecessionPlaybookModal } from './RecessionPlaybookModal';

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
  });

  it('renders HistoricalComparisonSidebar and toggles between Overlay and Sparklines', () => {
    render(<HistoricalComparisonSidebar />);

    expect(screen.getByText(/Historical Comparison: Last 3 Recessions/i)).toBeInTheDocument();
    expect(screen.getByText(/2001 \(Tech\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2008 \(GFC\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2020 \(COVID\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Now \(2025\/26\)/i)).toBeInTheDocument();

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
});
