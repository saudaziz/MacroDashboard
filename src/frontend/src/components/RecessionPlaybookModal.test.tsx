import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecessionPlaybookModal } from './RecessionPlaybookModal';
import { fetchRecessionPlaybook, type PlaybookSnapshot } from '../playbookApi';

vi.mock('../playbookApi', () => ({ fetchRecessionPlaybook: vi.fn() }));

const reading = (value: number | null, series: string) => ({ value, date: value === null ? null : '2026-10-07', series });

const snapshot = (overrides: Partial<Record<string, number | null>> = {}): PlaybookSnapshot => {
  const values: Record<string, [number | null, string]> = {
    fed_target_lower: [3.75, 'DFEDTARL'],
    fed_target_upper: [4.0, 'DFEDTARU'],
    dff: [3.88, 'DFF'],
    dgs10: [5.27, 'DGS10'],
    dgs2: [4.79, 'DGS2'],
    t10y2y: [0.48, 'T10Y2Y'],
    vix: [15.52, 'VIXCLS'],
    unrate: [4.2, 'UNRATE'],
    hy_oas: [3.25, 'BAMLH0A0HYM2'],
    nfci: [-0.4, 'NFCI'],
    icsa: [230000, 'ICSA'],
    sloos: [5.0, 'DRTSCILM'],
    umcsent: [55, 'UMCSENT'],
  };
  const readings: Record<string, ReturnType<typeof reading>> = {};
  for (const [key, [value, series]] of Object.entries(values)) {
    readings[key] = reading(key in overrides ? (overrides[key] ?? null) : value, series);
  }
  return {
    source: 'fred',
    reason: null,
    generated_at: '2026-10-14T09:00:00',
    readings,
    sahm_gap: { value: -0.07, date: '2026-09-01' },
    icsa_spike_pct: { value: 4.2, date: '2026-10-03' },
  };
};

const mockedFetch = vi.mocked(fetchRecessionPlaybook);

describe('RecessionPlaybookModal live data and scorecard', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('shows 0 of 6 measurable tripwires and Stage 1 when every stage gate is clear', async () => {
    mockedFetch.mockResolvedValue(snapshot());
    render(<RecessionPlaybookModal isOpen onClose={vi.fn()} live={{ icr: 2.15 }} />);
    expect(await screen.findByText(/0 of 6 measurable tripwires triggered/i)).toBeInTheDocument();
    expect(screen.getByText(/Active: Stage 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/WE ARE HERE/i)).toHaveLength(1);
  });

  it('moves the active stage to 4 when live VIX is above 25', async () => {
    mockedFetch.mockResolvedValue(snapshot({ vix: 30 }));
    render(<RecessionPlaybookModal isOpen onClose={vi.fn()} live={{ icr: 2.15 }} />);
    expect(await screen.findByText(/1 of 6 measurable tripwires triggered/i)).toBeInTheDocument();
    expect(screen.getByText(/Active: Stage 4/i)).toBeInTheDocument();
    expect(screen.getAllByText(/WE ARE HERE/i)).toHaveLength(1);
  });

  it('moves the active stage to 3 when the Sahm gap reaches the trigger', async () => {
    mockedFetch.mockResolvedValue({ ...snapshot(), sahm_gap: { value: 0.55, date: '2026-09-01' } });
    render(<RecessionPlaybookModal isOpen onClose={vi.fn()} live={{ icr: 2.15 }} />);
    expect(await screen.findByText(/Active: Stage 3/i)).toBeInTheDocument();
  });

  it('moves the active stage to 2 when ICR falls below 1.8x', async () => {
    mockedFetch.mockResolvedValue(snapshot());
    render(<RecessionPlaybookModal isOpen onClose={vi.fn()} live={{ icr: 1.5 }} />);
    expect(await screen.findByText(/Active: Stage 2/i)).toBeInTheDocument();
  });

  it('shows unavailable values and no stage marker when the load fails', async () => {
    mockedFetch.mockRejectedValue(new Error('network down'));
    render(<RecessionPlaybookModal isOpen onClose={vi.fn()} />);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    expect(screen.queryByText(/WE ARE HERE/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Active: unknown/i)).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  it('never shows a mock number when FRED is not configured', async () => {
    mockedFetch.mockResolvedValue({
      ...snapshot(),
      source: 'unavailable',
      reason: 'FRED_API_KEY is not configured',
      readings: Object.fromEntries(Object.entries(snapshot().readings).map(([k, r]) => [k, { ...r, value: null, date: null }])),
      sahm_gap: { value: null, date: null },
      icsa_spike_pct: { value: null, date: null },
    });
    render(<RecessionPlaybookModal isOpen onClose={vi.fn()} />);
    expect(await screen.findByText(/FRED_API_KEY is not configured/i)).toBeInTheDocument();
    expect(screen.queryByText('5.27%')).not.toBeInTheDocument();
    expect(screen.queryByText('15.52')).not.toBeInTheDocument();
  });

  it('shows the regime link with the model probabilities and the reference sections', async () => {
    mockedFetch.mockResolvedValue(snapshot());
    const onClose = vi.fn();
    render(
      <RecessionPlaybookModal
        isOpen
        onClose={onClose}
        live={{ icr: 2.15 }}
        regime={{ recessionProb: 28, softLandingProb: 55, expansionProb: 17 }}
      />,
    );
    expect(screen.getByText(/Recession 28%/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Go to Regime Probability gauge/i }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByText(/Asset-Class Tendencies by Stage/i)).toBeInTheDocument();
    expect(screen.getByText(/Historical Episodes: Did the Chain Play Out/i)).toBeInTheDocument();
    expect(screen.getByText(/Glossary/i)).toBeInTheDocument();
    expect(screen.getByText(/Educational only, not investment advice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print \/ Save as PDF/i })).toBeInTheDocument();
  });
});
