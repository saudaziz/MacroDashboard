import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Clock,
  Activity,
  CheckCircle2,
  Sliders,
  MapPin,
  AlertTriangle,
  History,
  Info,
  Printer,
  Gauge,
  PieChart,
} from 'lucide-react';
import { fetchRecessionPlaybook, type PlaybookSnapshot } from '../playbookApi';
import type { RegimeProbabilities } from '../utils/formatters';
import { SAHM_TRIGGER, formatSignedPct, isSahmTriggered } from './recessionMath';

// Values the app already has in memory that FRED does not supply through the playbook endpoint.
export interface LiveReadings {
  icr?: number | undefined; // mid-cap ICR proxy from the credit payload (no FRED series)
}

interface RecessionPlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  live?: LiveReadings | undefined;
  regime?: RegimeProbabilities | undefined;
}

const MANUAL_CAPEX_PE = 21.5; // no feed for this yet; labelled "manual" wherever shown

// Horizon columns of the timeline matrix.
const HORIZON_COLS = ['Immediate (< 1 Mo)', 'Short (1–3 Mos)', 'Medium (3–6 Mos)', 'Structural (6–14 Mos)'];

const SEVERITY_ROWS = [
  { label: 'Extreme', color: '#f43f5e' },
  { label: 'High', color: '#f59e0b' },
  { label: 'Structural', color: '#10b981' },
];

const UNAVAILABLE = 'Unavailable';

interface Readings {
  fedTargetRange: string | null;
  dff: number | null;
  dgs10: number | null;
  dgs2: number | null;
  spread10Y2Y: number | null;
  vix: number | null;
  unrate: number | null;
  hyOasBps: number | null;
  nfci: number | null;
  icsaSpikePct: number | null;
  sloos: number | null;
  umcsent: number | null;
  sahmGap: number | null;
  icr: number | null;
}

const readingValue = (snapshot: PlaybookSnapshot | null, key: string): number | null =>
  snapshot?.readings[key]?.value ?? null;

const buildReadings = (snapshot: PlaybookSnapshot | null, live?: LiveReadings): Readings => {
  const lower = readingValue(snapshot, 'fed_target_lower');
  const upper = readingValue(snapshot, 'fed_target_upper');
  const oas = readingValue(snapshot, 'hy_oas');
  return {
    fedTargetRange: lower !== null && upper !== null ? `${lower.toFixed(2)}% – ${upper.toFixed(2)}%` : null,
    dff: readingValue(snapshot, 'dff'),
    dgs10: readingValue(snapshot, 'dgs10'),
    dgs2: readingValue(snapshot, 'dgs2'),
    spread10Y2Y: readingValue(snapshot, 't10y2y'),
    vix: readingValue(snapshot, 'vix'),
    unrate: readingValue(snapshot, 'unrate'),
    hyOasBps: oas !== null ? Math.round(oas * 100) : null, // FRED OAS is in percent
    nfci: readingValue(snapshot, 'nfci'),
    icsaSpikePct: snapshot?.icsa_spike_pct.value ?? null,
    sloos: readingValue(snapshot, 'sloos'),
    umcsent: readingValue(snapshot, 'umcsent'),
    sahmGap: snapshot?.sahm_gap.value ?? null,
    icr: live?.icr && live.icr > 0 ? live.icr : null,
  };
};

const fmt = (value: number | null, digits: number, suffix = ''): string =>
  value === null ? UNAVAILABLE : `${value.toFixed(digits)}${suffix}`;

interface CatalystNode {
  id: string;
  name: string;
  timeX: string;
  timeColIndex: number;
  severityRowIndex: number;
  whatFails: string;
  currentVal: string;
  dangerThreshold: string;
  lag: string;
  color: string;
}

const buildCatalysts = (r: Readings): CatalystNode[] => [
  {
    id: 'vix',
    name: 'Volatility Awakening (VIX > 25)',
    timeX: 'Immediate (Days to Weeks)',
    timeColIndex: 0,
    severityRowIndex: 0,
    whatFails: 'Options market reprices downside tail risks; liquidity suddenly evaporates',
    currentVal: fmt(r.vix, 2),
    dangerThreshold: 'VIX holds above 25',
    lag: 'Days to weeks',
    color: '#a855f7',
  },
  {
    id: 'labor',
    name: 'Labor Market (Sahm Rule)',
    timeX: 'Coincident (0–2 Months)',
    timeColIndex: 1,
    severityRowIndex: 0,
    whatFails: 'Hiring freezes morph into broad layoffs; consumer aggregate demand collapses',
    currentVal: r.sahmGap === null ? UNAVAILABLE : `Sahm gap ${formatSignedPct(r.sahmGap).replace('%', '')} pt`,
    dangerThreshold: `Sahm gap ≥ +${SAHM_TRIGGER.toFixed(2)} pt`,
    lag: 'Coincident (fires as layoffs begin)',
    color: '#f43f5e',
  },
  {
    id: 'capex',
    name: 'AI Capex Disappointment',
    timeX: '1–3 Months',
    timeColIndex: 1,
    severityRowIndex: 1,
    whatFails: 'Mega-cap hyperscalers prune cloud spend; growth multiples de-rate',
    currentVal: `P/E ~${MANUAL_CAPEX_PE} (manual)`,
    dangerThreshold: 'Guidance cuts across 2+ hyperscalers',
    lag: '1 to 3 months',
    color: '#38bdf8',
  },
  {
    id: 'credit',
    name: 'Corporate Credit Crunch',
    timeX: '2–4 Months',
    timeColIndex: 2,
    severityRowIndex: 1,
    whatFails: 'Debt wall maturity refinancing fails; mid-cap defaults surge',
    currentVal: r.icr === null ? `ICR ${UNAVAILABLE}` : `ICR ${r.icr.toFixed(2)}x (proxy)`,
    dangerThreshold: 'HY OAS > 500 bps, ICR < 1.8x',
    lag: '2 to 4 months',
    color: '#f59e0b',
  },
  {
    id: 'curve',
    name: 'Yield Curve Re-steepening',
    timeX: '6–14 Months',
    timeColIndex: 3,
    severityRowIndex: 2,
    whatFails: 'Fed cuts short rates rapidly as growth cools; a bull steepener is the confirmation',
    currentVal: r.spread10Y2Y === null ? UNAVAILABLE : formatSignedPct(r.spread10Y2Y),
    dangerThreshold: 'Bull steepening: spread > +1.00% with 2Y falling',
    lag: '3 to 14 months (avg. ~6 months)',
    color: '#10b981',
  },
];

// Tone classes for the status pills.
const TONE = {
  amber: 'bg-amber-500/20 text-amber-300',
  cyan: 'bg-cyan-500/20 text-cyan-300',
  slate: 'bg-slate-700/60 text-slate-300',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  rose: 'bg-rose-500/20 text-rose-300',
  muted: 'bg-slate-800 text-slate-500',
};

interface IndicatorRow {
  id: string;
  indicator: string;
  ticker: string;
  current: string;
  normal: string;
  tripwire: string;
  status: string;
  tone: string;
  // true = tripwire hit, false = measured and clear, null = unavailable, qualitative, or leading (not counted)
  tripped: boolean | null;
  highlight?: boolean;
  section: 'core' | 'leading';
}

const buildIndicators = (r: Readings): IndicatorRow[] => {
  const sahmFired = r.sahmGap === null ? null : isSahmTriggered(r.sahmGap);
  const vixHit = r.vix === null ? null : r.vix > 25;
  const icrHit = r.icr === null ? null : r.icr < 1.8;
  const oasHit = r.hyOasBps === null ? null : r.hyOasBps > 500;
  const spreadHit = r.spread10Y2Y === null ? null : r.spread10Y2Y > 1.0 ? null : false;
  const tenYearHit = r.dgs10 === null ? null : r.dgs10 > 5.5 || r.dgs10 < 3.5;
  const na = UNAVAILABLE;
  return [
    {
      id: 'fed-range',
      indicator: 'Fed Funds Target Range',
      ticker: 'DFEDTARL / DFEDTARU',
      current: r.fedTargetRange ?? na,
      normal: '2.50% – 3.50%',
      tripwire: 'Hikes continue while unemployment rises',
      status: 'Hiking Cycle',
      tone: TONE.amber,
      tripped: null,
      section: 'core',
    },
    {
      id: 'dff',
      indicator: 'Effective Fed Funds (DFF)',
      ticker: 'DFF',
      current: fmt(r.dff, 2, '%'),
      normal: 'Inside the target range',
      tripwire: 'Above 4.00% while unemployment rises',
      status: 'Restrictive',
      tone: TONE.slate,
      tripped: null,
      section: 'core',
    },
    {
      id: 'spread',
      indicator: '10Y-2Y Treasury Spread',
      ticker: 'T10Y2Y',
      current: r.spread10Y2Y === null ? na : formatSignedPct(r.spread10Y2Y),
      normal: '+0.50% to +1.00%',
      tripwire: 'Bull steepening: > +1.00% with 2Y falling',
      status: r.spread10Y2Y === null ? 'Unavailable' : 'Bear Steepener',
      tone: r.spread10Y2Y === null ? TONE.muted : TONE.amber,
      // Above +1.00% needs the 2Y trend to confirm, so the level alone does not count.
      tripped: spreadHit,
      highlight: true,
      section: 'core',
    },
    {
      id: 'dgs10',
      indicator: '10-Year Treasury Yield',
      ticker: 'DGS10',
      current: fmt(r.dgs10, 2, '%'),
      normal: '3.50% – 4.50%',
      tripwire: 'Above 5.50% (term-premium selloff) or below 3.50% (growth scare)',
      status: r.dgs10 === null ? 'Unavailable' : 'Outside Normal Range',
      tone: r.dgs10 === null ? TONE.muted : TONE.slate,
      tripped: tenYearHit,
      section: 'core',
    },
    {
      id: 'dgs2',
      indicator: '2-Year Treasury Yield',
      ticker: 'DGS2',
      current: fmt(r.dgs2, 2, '%'),
      normal: '3.00% – 4.00%',
      tripwire: 'Falling faster than 10Y (bull steepener)',
      status: r.dgs2 === null ? 'Unavailable' : 'Trend Check Needed',
      tone: r.dgs2 === null ? TONE.muted : TONE.slate,
      tripped: null,
      section: 'core',
    },
    {
      id: 'vix',
      indicator: 'CBOE Volatility (VIX)',
      ticker: 'VIXCLS',
      current: fmt(r.vix, 2),
      normal: '12.00 – 18.00',
      tripwire: 'Holds above 25 for several days',
      status: vixHit === null ? 'Unavailable' : vixHit ? 'Above Tripwire' : 'Within Normal Range',
      tone: vixHit === null ? TONE.muted : vixHit ? TONE.rose : TONE.emerald,
      tripped: vixHit,
      section: 'core',
    },
    {
      id: 'icr',
      indicator: 'Mid-Cap Interest Coverage (ICR)',
      ticker: 'Credit payload (proxy)',
      current: fmt(r.icr, 2, 'x'),
      normal: '> 3.00x',
      tripwire: '< 1.80x (refinancing crunch)',
      status: icrHit === null ? 'Unavailable' : icrHit ? 'Tripwire Hit' : 'Vulnerable Buffer',
      tone: icrHit === null ? TONE.muted : icrHit ? TONE.rose : TONE.amber,
      tripped: icrHit,
      section: 'core',
    },
    {
      id: 'oas',
      indicator: 'High-Yield Spread (OAS)',
      ticker: 'BAMLH0A0HYM2',
      current: r.hyOasBps === null ? na : `~${r.hyOasBps} bps`,
      normal: '300 – 400 bps',
      tripwire: '> 500 bps (credit freezing)',
      status: oasHit === null ? 'Unavailable' : oasHit ? 'Above Tripwire' : 'Within Normal Range',
      tone: oasHit === null ? TONE.muted : oasHit ? TONE.rose : TONE.emerald,
      tripped: oasHit,
      section: 'core',
    },
    {
      id: 'sahm',
      indicator: 'Sahm Rule Gap (from UNRATE)',
      ticker: 'SAHMREALTIME / UNRATE',
      current:
        r.sahmGap === null
          ? na
          : `${formatSignedPct(r.sahmGap).replace('%', '')} pt (UR ${fmt(r.unrate, 1, '%')})`,
      normal: '< +0.30 pt',
      tripwire: `≥ +${SAHM_TRIGGER.toFixed(2)} pt (fires)`,
      status: sahmFired === null ? 'Unavailable' : sahmFired ? 'Triggered' : 'Below Trigger',
      tone: sahmFired === null ? TONE.muted : sahmFired ? TONE.rose : TONE.cyan,
      tripped: sahmFired,
      highlight: true,
      section: 'core',
    },
    // Leading indicators: shown with their live reading but not counted in the scorecard.
    {
      id: 'nfci',
      indicator: 'Chicago Fed Financial Conditions (NFCI)',
      ticker: 'NFCI',
      current: r.nfci === null ? na : `${r.nfci.toFixed(2)} ${r.nfci > 0 ? '(tighter than avg.)' : '(looser than avg.)'}`,
      normal: '< 0 (looser than average)',
      tripwire: '> 0 (tighter than average)',
      status: 'Leading',
      tone: TONE.slate,
      tripped: null,
      section: 'leading',
    },
    {
      id: 'icsa',
      indicator: 'Initial Jobless Claims (4-wk avg vs 6-month low)',
      ticker: 'ICSA',
      current: r.icsaSpikePct === null ? na : `${r.icsaSpikePct >= 0 ? '+' : ''}${r.icsaSpikePct.toFixed(1)}%`,
      normal: 'Within 10% of 6-month low',
      tripwire: 'Up > 20% from 6-month low (rule of thumb)',
      status: 'Leading',
      tone: TONE.slate,
      tripped: null,
      section: 'leading',
    },
    {
      id: 'sloos',
      indicator: 'Bank Lending Standards (net % tightening)',
      ticker: 'DRTSCILM',
      current: fmt(r.sloos, 1, '%'),
      normal: 'Below 0%',
      tripwire: 'Net tightening > 20% (rule of thumb)',
      status: 'Leading',
      tone: TONE.slate,
      tripped: null,
      section: 'leading',
    },
    {
      id: 'umcsent',
      indicator: 'Consumer Sentiment',
      ticker: 'UMCSENT',
      current: fmt(r.umcsent, 1),
      normal: 'Above 70',
      tripwire: 'Below 60 (historically depressed)',
      status: 'Leading',
      tone: TONE.slate,
      tripped: null,
      section: 'leading',
    },
  ];
};

// Stage 4 if VIX is tripped; stage 3 if Sahm fires; stage 2 if credit tripwires hit; stage 1 only when
// every stage-gating tripwire is measured and clear. Returns null when that cannot be established.
const deriveActiveStage = (indicators: IndicatorRow[]): number | null => {
  const tripped = (id: string) => indicators.find((i) => i.id === id)?.tripped;
  if (tripped('vix') === true) return 4;
  if (tripped('sahm') === true) return 3;
  if (tripped('icr') === true || tripped('oas') === true) return 2;
  const allClear = ['vix', 'sahm', 'icr', 'oas'].every((id) => tripped(id) === false);
  return allClear ? 1 : null;
};

interface HistoricalEpisode {
  episode: string;
  inverted: string;
  uninverted: string;
  recession: string;
  lag: string;
  note: string;
}

// Month-level approximations. Verify against FRED T10Y2Y and USREC before relying on them.
const HISTORICAL_EPISODES: HistoricalEpisode[] = [
  {
    episode: 'Dot-com bust (2000–01)',
    inverted: '~Jul 2000',
    uninverted: '~Jan 2001',
    recession: 'Mar 2001',
    lag: '~2 months',
    note: 'The Fed began cutting in Jan 2001 as growth weakened. The chain ran close to its textbook order.',
  },
  {
    episode: 'Housing bubble (2006–07)',
    inverted: '~Jan 2006',
    uninverted: '~Aug 2007',
    recession: 'Dec 2007',
    lag: '~4 months',
    note: 'The curve stayed inverted for about 18 months before recession. Un-inversion came as short rates fell during the credit stress.',
  },
  {
    episode: 'COVID shock (2019–20)',
    inverted: '~Aug 2019',
    uninverted: '~Mar 2020',
    recession: 'Feb 2020',
    lag: 'Recession came first',
    note: 'An external shock, not the curve chain. The recession started before the curve un-inverted.',
  },
  {
    episode: 'Hiking cycle (2022–24)',
    inverted: '~Jul 2022',
    uninverted: '~Sep 2024',
    recession: 'None yet (as of snapshot)',
    lag: 'Not yet applicable',
    note: 'Deepest inversion about −1.1 pp (Jul 2023). The 2-year lag has passed without a recession, so the timing rule is not reliable on its own.',
  },
];

interface AssetRow {
  stage: string;
  equities: string;
  treasuries: string;
  credit: string;
  cashHavens: string;
}

// Rough historical tendencies for education. Not forecasts, and not advice for any individual.
const ASSET_GUIDANCE: AssetRow[] = [
  {
    stage: '1. Policy tightening',
    equities: 'Leadership narrows. Quality and profitability have tended to hold up better than speculative growth.',
    treasuries: 'Yields are high, so intermediate Treasuries offer income. Long bonds carry term-premium risk.',
    credit: 'Higher-quality issuers tend to be safer. Check which companies have debt maturing soon.',
    cashHavens: 'Cash yields are high. An emergency buffer is the main job here.',
  },
  {
    stage: '2. Refinancing squeeze',
    equities: 'Levered mid-caps and companies with near-term maturities have been the first to de-rate.',
    treasuries: 'Duration starts to help if growth weakens, but this is not yet a clear signal.',
    credit: 'High-yield spreads often widen before defaults show up. Avoid weak refinancing profiles.',
    cashHavens: 'Liquidity preference tends to rise. Keep cash available for stage 4.',
  },
  {
    stage: '3. Labor cracks',
    equities: 'Defensive sectors (staples, health care, utilities) have historically held up better.',
    treasuries: 'Long Treasuries have often rallied as rate cuts get priced in.',
    credit: 'Spreads tend to widen. Moving up in quality has been the common response.',
    cashHavens: 'Cash is the buffer for buying opportunities later.',
  },
  {
    stage: '4. Market reset',
    equities: 'Drawdowns are common. Forced selling is the big mistake. Staged buying has worked better than lump sums.',
    treasuries: 'High-quality Treasuries have often been the safe haven, but not always. In 2022 bonds and stocks fell together.',
    credit: 'Spreads widen sharply. Buying into this is a plan for patient investors, not a single trade.',
    cashHavens: 'Liquidity matters most. Gold and the dollar have been havens in past shocks, with mixed records.',
  },
];

const GLOSSARY: { term: string; definition: string }[] = [
  { term: 'Bull steepener', definition: 'Curve steepens because short-term yields fall fast. Usually means the Fed is cutting into weakness.' },
  { term: 'Bear steepener', definition: 'Curve steepens because long-term yields rise. Often driven by inflation or term premium.' },
  { term: 'Sahm Rule', definition: 'Fires when the 3-month average unemployment rate is 0.5 pt above its lowest 3-month average of the prior 12 months.' },
  { term: 'ICR', definition: 'Interest coverage ratio: operating earnings divided by interest expense. Below 1.8x means little room to refinance.' },
  { term: 'OAS', definition: 'Option-adjusted spread: the extra yield on a corporate bond index over Treasuries, adjusted for embedded options.' },
  { term: 'Term premium', definition: 'Extra yield investors demand for holding long-term bonds instead of rolling short-term ones.' },
];

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Print shows only the playbook dialog, in black on white, with the buttons hidden.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #recession-playbook-print, #recession-playbook-print * { visibility: visible !important; }
  #recession-playbook-print {
    position: absolute !important; inset: 0 !important; max-height: none !important;
    width: 100% !important; box-shadow: none !important; overflow: visible !important;
    background: #fff !important; color: #000 !important; border: none !important;
  }
  #recession-playbook-print * { color: #000 !important; background: transparent !important; border-color: #bbb !important; box-shadow: none !important; }
  #recession-playbook-print button, #recession-playbook-print .no-print { display: none !important; }
  #recession-playbook-print .overflow-y-auto { overflow: visible !important; }
}`;

export const RecessionPlaybookModal: React.FC<RecessionPlaybookModalProps> = ({ isOpen, onClose, live, regime }) => {
  const [catalystView, setCatalystView] = useState<'timeline' | 'table'>('timeline');
  const [snapshot, setSnapshot] = useState<PlaybookSnapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedCatalystId, setSelectedCatalystId] = useState<string>('labor');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Keep the latest onClose without re-running the focus effect on every parent render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Fetch live readings when the popup opens. Re-opening after a load does not refetch.
  useEffect(() => {
    if (!isOpen || snapshot) return;
    let cancelled = false;
    fetchRecessionPlaybook()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, snapshot]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      // Keep Tab focus inside the dialog.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
        if (focusables.length === 0) return;
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow || 'unset';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const readings = buildReadings(snapshot, live);
  const catalysts = buildCatalysts(readings);
  const indicators = buildIndicators(readings);
  const activeStage = deriveActiveStage(indicators);
  const measurable = indicators.filter((i) => i.section === 'core' && i.tripped !== null);
  const triggeredCount = measurable.filter((i) => i.tripped === true).length;
  const unavailableCount = indicators.filter((i) => i.section === 'core' && i.tripped === null && i.status === UNAVAILABLE).length;
  const selectedCatalyst = catalysts.find((c) => c.id === selectedCatalystId) ?? null;
  const latestObservation = snapshot
    ? Object.values(snapshot.readings)
        .map((r) => r.date)
        .filter((d): d is string => Boolean(d))
        .sort()
        .at(-1) ?? null
    : null;
  const dataBanner = loadFailed
    ? 'Live readings could not be loaded. Values are shown as unavailable, not estimated.'
    : !snapshot
      ? 'Loading live FRED readings…'
      : snapshot.source === 'unavailable'
        ? `Live readings unavailable: ${snapshot.reason ?? 'unknown reason'}`
        : snapshot.source === 'partial'
          ? `Some series could not be loaded: ${snapshot.reason ?? ''}`
          : null;

  const goToRegimeGauge = () => {
    onClose();
    window.setTimeout(() => {
      document.getElementById('regime-probability-gauge')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const markerOf = (stage: number) =>
    activeStage === stage ? (
      <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-cyan-500 px-2 py-0.5 text-[9px] font-mono font-extrabold text-black uppercase tracking-wider shadow">
        <MapPin size={10} className="fill-black" />
        <span>WE ARE HERE</span>
      </div>
    ) : null;
  const activeRing = (stage: number) =>
    activeStage === stage ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0d1420]' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <style>{PRINT_CSS}</style>
      <div
        id="recession-playbook-print"
        ref={dialogRef}
        className="relative flex flex-col max-h-[92vh] w-full max-w-5xl rounded-xl border border-slate-700 bg-[#0d1420] text-slate-100 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#080d16] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2 text-red-400 border border-red-500/30">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                <span>The Recession Playbook: Transmission Mechanics & Historical Shocks</span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30 uppercase">
                  by Saud Aziz
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 border border-slate-700 uppercase">
                  Educational Deep Dive
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authored by Saud Aziz • Latest FRED observation: {latestObservation ?? 'loading'} • Generated{' '}
                {snapshot?.generated_at ?? '—'}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto px-6 py-5 space-y-6 text-xs text-slate-300">
          {dataBanner && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-[11px] text-amber-300">
              {dataBanner}
            </div>
          )}

          {/* Regime link: the probabilities the top gauge shows, with a jump back to it */}
          {regime && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#080d16] px-3 py-2">
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                <PieChart size={14} className="text-cyan-400" />
                <span>Model regime:</span>
                <span className="font-bold text-rose-300">Recession {regime.recessionProb}%</span>
                <span className="text-slate-500">•</span>
                <span className="font-bold text-emerald-300">Soft landing {regime.softLandingProb}%</span>
                <span className="text-slate-500">•</span>
                <span className="font-bold text-cyan-300">Expansion {regime.expansionProb}%</span>
              </div>
              <button
                type="button"
                onClick={goToRegimeGauge}
                className="no-print flex items-center gap-1 rounded-full border border-cyan-500/40 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/10"
              >
                <Gauge size={12} />
                <span>Go to Regime Probability gauge</span>
              </button>
            </div>
          )}

          {/* Section 1: The 4-Stage Transmission Sequence */}
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-amber-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-amber-400">
                  1. The Transmission Chain: How Tight Policy Becomes a Recession
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {activeStage === null
                  ? 'Active stage unknown until live readings load'
                  : `Active stage is set by which tripwires have fired (now: Stage ${activeStage})`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {/* Stage 1 */}
              <div className={`relative rounded-lg border-2 border-cyan-500 bg-cyan-950/30 p-3 flex flex-col justify-between shadow-lg shadow-cyan-950/50 ${activeRing(1)}`}>
                {markerOf(1)}
                <div>
                  <div className="font-mono text-[10px] text-cyan-400 uppercase font-bold mb-1">
                    Stage 1 (Policy Tightening)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Restrictive Policy</div>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                    The Fed target range is <span className="font-mono">{readings.fedTargetRange ?? UNAVAILABLE}</span>. The 10Y–2Y spread is{' '}
                    <span className="font-mono text-cyan-300 font-bold">
                      {readings.spread10Y2Y === null ? UNAVAILABLE : formatSignedPct(readings.spread10Y2Y)}
                    </span>
                    , mostly because long-end yields are rising.
                  </p>
                  <p className="text-[10px] text-cyan-200/80 bg-cyan-900/30 p-1.5 rounded border border-cyan-800/40 leading-snug">
                    <span className="font-semibold text-cyan-300">Why it matters: </span>
                    A bear steepener (long yields up) is not the classic recession signal. The classic one is a bull steepener, where the 2Y falls fast as the Fed cuts. That is the confirmation to watch for.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-cyan-400 font-bold border-t border-cyan-900/50 pt-2">
                  <span>Watch: Bull Steepener</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Stage 2 */}
              <div className={`relative rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 flex flex-col justify-between ${activeRing(2)}`}>
                {markerOf(2)}
                <div>
                  <div className="font-mono text-[10px] text-amber-400 uppercase font-bold mb-1">
                    Stage 2 (Refinancing)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1">Debt Wall Crunch ⚠️</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Mid-caps must refinance low-rate 2021 debt at today&apos;s much higher rates. Mid-cap ICR is{' '}
                    <span className="font-mono text-amber-300 font-semibold">{fmt(readings.icr, 2, 'x')}</span> (proxy); defaults rise if ICR falls below 1.8x.
                  </p>
                  <p className="text-[10px] text-amber-300/80 bg-amber-900/20 p-1.5 rounded border border-amber-800/40 leading-snug">
                    <span className="font-semibold text-amber-300">Why it matters: </span>
                    Rolling low-rate maturities into restrictive rates burns free cash flow, compelling corporate capex freezes.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-amber-400/80 border-t border-amber-900/50 pt-2">
                  <span>Lag: 2–4 Mos</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Stage 3 */}
              <div className={`relative rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 flex flex-col justify-between ${activeRing(3)}`}>
                {markerOf(3)}
                <div>
                  <div className="font-mono text-[10px] text-rose-400 uppercase font-bold mb-1">
                    Stage 3 (Labor Cracks)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1 flex items-center gap-1">
                    <span>Sahm Rule Fires ⚠️</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Fires when the 3-month average unemployment rate is <span className="font-mono text-rose-300 font-semibold">0.5 pt</span> above its 12-month low. Today&apos;s gap is{' '}
                    <span className="font-mono">
                      {readings.sahmGap === null ? UNAVAILABLE : `${formatSignedPct(readings.sahmGap).replace('%', '')} pt`}
                    </span>
                    {readings.sahmGap === null ? '.' : isSahmTriggered(readings.sahmGap) ? ', so it has fired.' : ', so it has not fired.'}
                  </p>
                  <p className="text-[10px] text-rose-300/80 bg-rose-900/20 p-1.5 rounded border border-rose-800/40 leading-snug">
                    <span className="font-semibold text-rose-300">Why it matters: </span>
                    Sahm is coincident: by the time it fires, hiring freezes have already turned into layoffs, and the income loss feeds demand collapse.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-rose-400/80 border-t border-rose-900/50 pt-2">
                  <span>Lag: Coincident (0–2 Mos)</span>
                  <ArrowRight size={12} />
                </div>
              </div>

              {/* Stage 4 */}
              <div className={`relative rounded-lg border border-red-500/40 bg-red-950/30 p-3 flex flex-col justify-between ${activeRing(4)}`}>
                {markerOf(4)}
                <div>
                  <div className="font-mono text-[10px] text-red-400 uppercase font-bold mb-1">
                    Stage 4 (Market Reset)
                  </div>
                  <div className="font-bold text-slate-100 text-sm mb-1">VIX & Earnings Shock ⚠️</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                    Earnings downgrades spread. Volatility awakens violently (<span className="font-mono text-red-300 font-semibold">VIX &gt; 25</span>); liquidity contracts. Today&apos;s VIX is{' '}
                    <span className="font-mono">{fmt(readings.vix, 2)}</span>.
                  </p>
                  <p className="text-[10px] text-red-300/80 bg-red-900/20 p-1.5 rounded border border-red-800/40 leading-snug">
                    <span className="font-semibold text-red-300">Why it matters: </span>
                    Valuation multiples de-rate abruptly, prompting margin calls and rapid flight to sovereign safe havens.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-red-400 border-t border-red-900/50 pt-2">
                  <span>Lag: Days to Weeks</span>
                  <ShieldAlert size={12} />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-mono text-slate-500">
              Clock note: the curve has been positive since late 2024, so the lags below run from the start of the un-inversion, not from today.
            </p>
          </div>

          {/* Section 2: Real-Time Readings vs Recession Tripwires Table */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-red-400">
                  2. Real-Time Macro Readings vs. Recession Tripwires
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono flex-wrap">
                <span className={`rounded px-2 py-0.5 font-bold ${triggeredCount > 0 ? TONE.rose : TONE.emerald}`}>
                  {triggeredCount} of {measurable.length} measurable tripwires triggered
                </span>
                {unavailableCount > 0 && (
                  <span className={`rounded px-2 py-0.5 font-bold ${TONE.muted}`}>{unavailableCount} unavailable</span>
                )}
                <span className="rounded px-2 py-0.5 font-bold bg-cyan-500/20 text-cyan-300">
                  Active: {activeStage === null ? 'unknown' : `Stage ${activeStage}`}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080d16]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1420] font-mono text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Indicator</th>
                    <th className="py-2.5 px-3">FRED Ticker</th>
                    <th className="py-2.5 px-3 text-amber-400 font-bold">Current Value</th>
                    <th className="py-2.5 px-3">Safe / Normal Range</th>
                    <th className="py-2.5 px-3 text-red-400">Recession Danger Tripwire</th>
                    <th className="py-2.5 px-3">Current Regime Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {indicators.filter((i) => i.section === 'core').map((row) => (
                    <IndicatorTableRow key={row.id} row={row} />
                  ))}
                  <tr className="bg-slate-900/40">
                    <td colSpan={6} className="py-1.5 px-3 text-[10px] uppercase tracking-wider text-slate-500">
                      Leading indicators (shown for context; not counted in the scorecard)
                    </td>
                  </tr>
                  {indicators.filter((i) => i.section === 'leading').map((row) => (
                    <IndicatorTableRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] font-mono text-slate-500">
              ICR is a proxy from the credit payload, not a FRED series. Tripwires marked &quot;while unemployment rises&quot; or &quot;falling faster&quot; need a trend check and are not counted. Jobless claims uses a rule of thumb.
            </p>
          </div>

          {/* Section 3: Shock Catalysts Timeline (Time to Recession vs Severity) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-cyan-400">
                  3. Shock Catalysts: Timeline Matrix & Lag Horizons
                </h3>
              </div>

              {/* View Switcher: Interactive Timeline vs Table */}
              <div className="no-print flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCatalystView('timeline')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-colors ${
                    catalystView === 'timeline' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders size={12} />
                  <span>Timeline Matrix</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatalystView('table')}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md transition-colors ${
                    catalystView === 'table' ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reference Table
                </button>
              </div>
            </div>

            {/* View A: 2D Interactive Timeline Matrix (rows = severity, columns = time horizon) */}
            {catalystView === 'timeline' && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-[#080d16] p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2 pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-300">Y-Axis: Severity / Impact</span>
                    <span className="text-cyan-400">X-Axis: Time Horizon to Recession (Fastest → Structural)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-[96px_repeat(4,minmax(128px,1fr))] gap-2 text-[10px] font-mono">
                      <div />
                      {HORIZON_COLS.map((label) => (
                        <div key={label} className="bg-slate-900/60 py-1 rounded text-center text-slate-500">
                          {label}
                        </div>
                      ))}

                      {SEVERITY_ROWS.map((row, rowIndex) => (
                        <React.Fragment key={row.label}>
                          <div className="flex items-center font-bold uppercase" style={{ color: row.color }}>
                            {row.label}
                          </div>
                          {HORIZON_COLS.map((_, colIndex) => (
                            <div
                              key={`${row.label}-${colIndex}`}
                              className="min-h-[92px] flex flex-col gap-2 rounded-lg border border-dashed border-slate-800/60 p-1.5"
                            >
                              {catalysts
                                .filter((c) => c.severityRowIndex === rowIndex && c.timeColIndex === colIndex)
                                .map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCatalystId(cat.id)}
                                    aria-pressed={selectedCatalyst?.id === cat.id}
                                    className={`w-full text-left p-2 rounded-lg border bg-slate-900/70 transition-all ${
                                      selectedCatalyst?.id === cat.id ? 'shadow-md' : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                    style={
                                      selectedCatalyst?.id === cat.id
                                        ? { borderColor: cat.color, boxShadow: `0 0 0 1px ${cat.color}` }
                                        : undefined
                                    }
                                  >
                                    <div className="text-[9px] text-slate-400 mb-1">{cat.lag}</div>
                                    <div className="font-semibold text-slate-200 text-[11px] leading-tight">{cat.name}</div>
                                  </button>
                                ))}
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detail Inspector for Selected Catalyst */}
                {selectedCatalyst && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={14} style={{ color: selectedCatalyst.color }} />
                        <h4 className="font-bold text-slate-100 text-xs">{selectedCatalyst.name}</h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          Horizon: {selectedCatalyst.timeX}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed mb-1">{selectedCatalyst.whatFails}</p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                        <span>Current: <strong className="text-amber-400">{selectedCatalyst.currentVal}</strong></span>
                        <span>Danger Threshold: <strong className="text-rose-400">{selectedCatalyst.dangerThreshold}</strong></span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono">
                      <div className="text-[10px] text-slate-500 uppercase">Historical Lag</div>
                      <div className="text-xs font-bold text-cyan-400">{selectedCatalyst.lag}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View B: Comprehensive Reference Table */}
            {catalystView === 'table' && (
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080d16]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0d1420] font-mono text-[11px] text-slate-400 uppercase">
                      <th className="py-2.5 px-3">Shock Catalyst</th>
                      <th className="py-2.5 px-3">What Fails in the Economy</th>
                      <th className="py-2.5 px-3">Current Metric</th>
                      <th className="py-2.5 px-3 text-red-400">Danger Threshold</th>
                      <th className="py-2.5 px-3 text-cyan-400 font-bold">Historical Lag to Recession</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {catalysts.map((cat) => (
                      <tr key={cat.id} className={`hover:bg-slate-800/20 ${cat.id === 'labor' ? 'bg-rose-500/5' : ''}`}>
                        <td className="py-2 px-3 font-semibold text-slate-200">{cat.name}</td>
                        <td className="py-2 px-3 text-slate-400">{cat.whatFails}</td>
                        <td className="py-2 px-3 text-amber-400">{cat.currentVal}</td>
                        <td className="py-2 px-3 text-red-300">{cat.dangerThreshold}</td>
                        <td className="py-2 px-3 text-cyan-300 font-bold">{cat.lag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Asset-class tendencies by stage */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <PieChart size={16} className="text-emerald-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-emerald-400">
                4. Asset-Class Tendencies by Stage
              </h3>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080d16]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1420] font-mono text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">Equities</th>
                    <th className="py-2.5 px-3">Treasuries / Duration</th>
                    <th className="py-2.5 px-3">Corporate Credit</th>
                    <th className="py-2.5 px-3">Cash & Havens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 align-top text-[11px] leading-snug">
                  {ASSET_GUIDANCE.map((row, idx) => (
                    <tr key={row.stage} className={activeStage === idx + 1 ? 'bg-cyan-500/5' : ''}>
                      <td className="py-2 px-3 font-mono font-bold text-slate-200 whitespace-nowrap">{row.stage}</td>
                      <td className="py-2 px-3 text-slate-400">{row.equities}</td>
                      <td className="py-2 px-3 text-slate-400">{row.treasuries}</td>
                      <td className="py-2 px-3 text-slate-400">{row.credit}</td>
                      <td className="py-2 px-3 text-slate-400">{row.cashHavens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] font-mono text-slate-500">
              Rough historical tendencies for learning, not forecasts or advice for any individual. Counter-examples exist: in 2022 bonds and stocks fell together.
            </p>
          </div>

          {/* Section 5: Historical Episodes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History size={16} className="text-purple-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-purple-400">
                5. Historical Episodes: Did the Chain Play Out?
              </h3>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#080d16]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1420] font-mono text-[11px] text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Episode</th>
                    <th className="py-2.5 px-3">Curve Inverted</th>
                    <th className="py-2.5 px-3">Curve Un-inverted</th>
                    <th className="py-2.5 px-3">NBER Recession Start</th>
                    <th className="py-2.5 px-3 text-cyan-400">Un-inversion to Recession</th>
                    <th className="py-2.5 px-3">What Happened</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {HISTORICAL_EPISODES.map((ep) => (
                    <tr key={ep.episode} className="hover:bg-slate-800/20 align-top">
                      <td className="py-2 px-3 font-semibold text-slate-200">{ep.episode}</td>
                      <td className="py-2 px-3 text-slate-400">{ep.inverted}</td>
                      <td className="py-2 px-3 text-slate-400">{ep.uninverted}</td>
                      <td className="py-2 px-3 text-slate-300">{ep.recession}</td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">{ep.lag}</td>
                      <td className="py-2 px-3 text-slate-400 font-sans text-[11px] leading-snug max-w-xs">{ep.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[10px] font-mono text-slate-500">
              Dates are approximate, to the month. Verify against FRED T10Y2Y and USREC before relying on them.
            </p>
          </div>

          {/* Section 6: Rules of Thumb for Everyday Investors */}
          <div className="rounded-lg border border-slate-800 bg-[#080d16] p-4">
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>3 Golden Rules of Thumb for Everyday Investors</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
              <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2.5">
                <span className="font-bold text-amber-300 block mb-1">Rule 1: Don&apos;t Panic on Inversion</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The real danger is not the inversion itself but the re-steepening that follows, especially a bull steepener where short-term yields fall fast.
                </p>
              </div>
              <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2.5">
                <span className="font-bold text-amber-300 block mb-1">Rule 2: Watch Sahm Rule, Not Headlines</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Headline inflation can be sticky. When the 3-month average unemployment rate rises 0.5 pt above its 12-month low, the Sahm Rule fires, and it has historically coincided with recessions.
                </p>
              </div>
              <div className="rounded-md border border-slate-800/80 bg-slate-900/40 p-2.5">
                <span className="font-bold text-amber-300 block mb-1">Rule 3: Keep Cash Ready for Stage 4</span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When VIX surges &gt; 25 and credit spreads widen, liquidity dries up. That is the time to deploy cash into high-quality assets at deep discounts.
                </p>
              </div>
            </div>
          </div>

          {/* Section 7: Glossary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-slate-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-slate-300">7. Glossary</h3>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {GLOSSARY.map((g) => (
                <div key={g.term} className="border-l-2 border-slate-800 pl-3">
                  <dt className="font-bold text-slate-200">{g.term}</dt>
                  <dd className="text-[11px] text-slate-400 leading-relaxed">{g.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#080d16] px-6 py-3">
          <span className="font-mono text-[11px] text-slate-500">
            Educational only, not investment advice. • Macro Intelligence Framework • Designed & Researched{' '}
            <strong className="text-amber-400">by Saud Aziz</strong>
          </span>
          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-colors"
            >
              <Printer size={13} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-1.5 text-xs font-bold text-slate-200 transition-colors"
            >
              Close Deep Dive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Shared row for the indicator table, so core and leading indicators render the same way.
const IndicatorTableRow: React.FC<{ row: IndicatorRow }> = ({ row }) => (
  <tr className={`hover:bg-slate-800/20 ${row.highlight ? 'bg-amber-500/5' : ''}`}>
    <td className="py-2 px-3 font-semibold text-slate-200">{row.indicator}</td>
    <td className="py-2 px-3 text-slate-500">{row.ticker}</td>
    <td className="py-2 px-3 text-amber-400 font-bold">{row.current}</td>
    <td className="py-2 px-3 text-slate-400">{row.normal}</td>
    <td className="py-2 px-3 text-red-300">{row.tripwire}</td>
    <td className="py-2 px-3">
      <span className={`rounded px-2 py-0.5 text-[10px] ${row.tone}`}>{row.status}</span>
    </td>
  </tr>
);
