# QA Baseline Log

## Baseline - 2026-06-01

Impacted scope: dashboard metric explanation tooltips.

Checks run before implementation:
- `npm test -- --run src/api.test.ts src/utils/sse.test.ts`
  - Result: pass, 4 tests across 2 files.
- `Invoke-WebRequest http://127.0.0.1:5173`
  - Result: HTTP 200, frontend is serving.

Observed current implementation:
- `MetricBig` renders an `Info` icon only when `helpText` is supplied.
- The explanation is exposed through the browser-native `title` attribute.
- There is no app-rendered tooltip element, so tooltip visibility/styling is browser-dependent and not covered by a focused component test.

## Post-Fix Validation - 2026-06-01

Checks run after implementation:
- `npm test`
  - Result: pass, 6 tests across 3 files.
- `npm run build`
  - Result: pass.
- Playwright local UI check against `http://127.0.0.1:5173`
  - Result: `Risk Sentiment explanation` button found.
  - Tooltip is hidden before interaction.
  - Tooltip is visible after hover.
  - Tooltip is visible after keyboard focus.

## Failure Investigation Baseline - 2026-06-01

Run examined:
- Latest runtime logs around `2026-06-01 11:26:31` to `11:26:59`.

Observed:
- Frontend and backend servers were running.
- Frontend successfully reached backend `POST /api/stream-dashboard`.
- Backend stream failed downstream because OpenRouter rejected completion calls with `401 Missing Authentication header`.
- No UI crash was observed in logs; the frontend displayed the backend error state.

## Gemini Failure Investigation Baseline - 2026-06-01

Run examined:
- Latest Gemini runtime logs around `2026-06-01 11:54:59` to `11:56:39`.

Observed:
- Frontend and backend servers were running.
- Frontend successfully reached backend `POST /api/stream-dashboard` with provider `Gemini`.
- Gemini provider initialized and a direct smoke call returned model output.
- Runtime failure occurred because Gemini responses are returned as list parts, while the dashboard JSON parser expects a string and calls `.strip()`.
- Repeated retries hit Gemini free-tier request quota and the frontend displayed the backend error state.

## Gemini Fix Validation - 2026-06-01

Checks run after implementation:
- `venv\Scripts\python.exe -m unittest tests.test_agent_response_normalization`
  - Result: pass, 3 tests.
- `venv\Scripts\python.exe -m compileall -q src\backend tests`
  - Result: pass.
- `npm test`
  - Result: pass, 6 frontend tests.
- `npm run build`
  - Result: pass.
- Live Gemini smoke call through `GeminiProvider`
  - Result: response content type was `list`; normalized text was valid JSON and parsed successfully.
- `GET /api/providers`
  - Result: returns `Gemini`, `OpenRouter`, `Ollama Gemma`, `Demo`.

## T5 Feature Delivery Baseline & Validation - 2026-10-07

Impacted scope:
- Executive Summary Panel with everyday investor takeaways, 3 pillars, and action checklist/tripwires toggle.
- 5-Year Historical Macro Correlations Panel (Treasuries 2Y/5Y/10Y, 10Y-2Y spread, and CBOE VIX).
- Recession Playbook Deep-Dive Modal (Approach 1) with 4-stage transmission sequence and real-time readings & countdown tables.
- Safe-Haven & Technicals Card: Contagion Analysis and USD Strength formatting (parsing Python dict and JSON strings into clean UI cards).
- Gold Technicals spot price availability and key levels.
- Browser window title set to "MacroDashboard by SaudAziz" in `index.html` and `App.tsx`.
- Author attribution "by Saud Aziz" across top header, deep dive popup, executive summary, and terminal footer.

Pre-Change Observations:
- No executive summary panel or 5-year historical correlations chart existed in the UI.
- Safe-Haven & Technicals section rendered raw unformatted Python dictionary strings `"{'credit_spreads': ...}"` and raw JSON `{"dxy_level": ...}` inside generic `<Tag>` and text tags.
- Gold Technicals reported "Gold spot unavailable from configured source (live quote not retrieved)." because FRED mock was missing London fixing gold series.
- Browser title defaulted to "frontend".

Post-Implementation Checks & Verification:
- `npm test`: pass, 10 tests across 4 files (`src/utils/sse.test.ts`, `src/utils/formatters.test.ts`, `src/api.test.ts`, `src/components/UIAtoms.test.tsx`).
- `npm run build`: pass, production Vite bundle built cleanly.
- `venv\Scripts\python.exe -m pytest tests/test_agent_response_normalization.py`: pass, 3 tests.
- Browser title verified: `<title>MacroDashboard by SaudAziz</title>` in `src/frontend/index.html` and enforced via `document.title` on mount in `src/frontend/src/App.tsx`.
- Live API endpoints verified: `GET /api/latest-dashboard` returning HTTP 200 with structured `correlations`, `executive_summary`, `gold_technical`, `usd_technical`, and `contagion_analysis`.
- Git commits verified: `220884f` and `898c25b` pushed to GitHub on branch `develop`.

## T6 Feature Delivery Baseline & Validation - 2026-10-07

Impacted scope:
- Top-of-page Regime Probability Gauge (Recession / Soft Landing / Expansion distribution).
- "What Changed Since Yesterday?" material moves alert strip.
- Historical Comparison Sidebar & 3-Recession Overlay (2001 Dot-Com, 2008 GFC, 2020 COVID vs. Now).
- Recession Playbook deep-dive upgrades: Tightened stage descriptions with active "You Are Here" indicator, one-liner significance, and interactive Shock Catalysts timeline (Time to Recession vs. Severity).

Pre-Change Observations:
- Dashboard top header lacks a consolidated Regime Probability horizontal bar synthesizing indicators into a single metric.
- No "What Changed Since Yesterday?" callout exists to display 24h material movements (e.g. Fed Funds, VIX, 10Y-2Y spread).
- Macro Correlations and safe haven sections do not have a side-by-side historical comparison column showing 2001, 2008, 2020 values with lead-in sparklines.
- The Recession Playbook deep dive modal currently lists stages without the tightened layoff countdown warnings or an active "You Are Here" locator.
- Shock Catalysts in the Playbook modal are presented strictly in a static tabular grid without a visual time-to-recession vs. severity timeline.

Post-Implementation Checks & Verification:
- `npm test -- --run`: Passed 16/16 tests across 5 files (`src/utils/formatters.test.ts`, `src/components/UIAtoms.test.tsx`, `src/utils/sse.test.ts`, `src/api.test.ts`, `src/components/MacroIntelligenceEnhancements.test.tsx`).
- `npm run build`: Passed, production Vite build compiled cleanly in 21.03s.
- `venv\Scripts\python.exe -m pytest tests/test_agent_response_normalization.py`: Passed 3/3 tests in 7.95s.
- UI validation: TopIntelligenceBar renders segmented probabilities (28% Recession / 55% Soft Landing / 17% Expansion) and material moves; HistoricalComparisonSidebar displays side-by-side 2001/2008/2020 comparison table and SVG lead-in sparklines; RecessionPlaybookModal features active "YOU ARE HERE" cursor badge on Stage 1, tightened Sahm Rule layoff horizon, and 2D Shock Catalysts Timeline Matrix with view switching.
- Knowledge graph updated via `graphify update .` (896 nodes, 3,336 edges, 75 communities).

## T7 Feature Delivery Baseline - 2026-10-07

Impacted scope:
- Live market data grounding: Real-time Gold spot (Yahoo Finance GC=F), Live Crypto feeds (Coinbase BTC, ETH, SOL spot), Correct August CPI YoY calculation, and Grounded Central Bank Policy Rates (FED, ECB, BOE, BOJ).

Pre-Change Observations:
- Gold price in dashboard displayed $2,658.40/oz due to discontinued FRED series fallback to mock, while live market gold is $4,132.30/oz (~$1,500 discrepancy).
- CPI YoY calculation in `get_series_yoy` had an off-by-one indexing error (`iloc[-13]`), producing 3.71% instead of 3.35% for August 2026.
- Crypto prices (BTC, ETH, SOL) were ungrounded; Gemini hallucinated BTC at $62,450 while live Coinbase spot is $83,244.78.
- Central bank rates (BOJ, BOE, ECB) were not grounded in `calendar_agent`, causing hallucinated rates (BOJ 0.25%, BOE 4.75%, ECB 3.25%) vs official rates (BOJ 0.30%, BOE 3.73%, ECB 2.50%).

Baseline Checks Run:
- `npm test -- --run`: Passed 16/16 tests across 5 files in 8.33s.
- `venv\Scripts\python.exe -m pytest tests/test_agent_response_normalization.py`: Passed 3/3 tests in 6.61s.
- Branch Gate: Confirmed active branch is `develop`.

Post-Implementation Checks & Verification:
- `venv\Scripts\python.exe -m pytest tests/`: Passed 7/7 tests in 11.91s (`tests/test_agent_response_normalization.py` + `tests/test_market_data.py`).
- `npm test -- --run`: Passed 16/16 tests across 5 files in 7.32s.
- `npm run build`: Passed, Vite production bundle generated cleanly in 1.55s.
- Real-time data verification:
  - Gold price: Live Yahoo Finance `GC=F` returns ~$4,132.30/oz, eliminating the ~$1,500 gap.
  - Crypto spot: Coinbase public API returns live spot for BTC (~$83,200), ETH (~$2,570), SOL (~$116).
  - CPI YoY: Updated `get_series_yoy` with official FRED `units='pc1'` and `iloc[-12]` yields exact 3.35% for August 2026.
  - Central Bank policy rates: FRED official series ground FED (3.75%), ECB (2.50%), BOE (3.73%), BOJ (0.30%).
- Sub-agent prompts in `calendar_agent` and `risk_agent` injected with mandatory verified figures to prevent LLM hallucinations.

## T8 Feature Delivery Baseline - 2026-10-07

Impacted scope:
- UI components displaying macro indicators and daily material moves: `TopIntelligenceBar` / `getDailyMaterialMoves`, `SafeHavenTechnicals`, `HistoricalComparisonSidebar`, `RecessionPlaybookModal`, and `Calendar`.
- Macro indicator prompt grounding in `macro_indicators_agent` and aggregator default values.

Pre-Change Observations:
- In `TopIntelligenceBar.tsx`, the 'What Changed Since Yesterday' ticker beneath the Regime Probability Gauge displays `Gold Spot: $2,642/oz` and `Fed Funds: 3.88%` because `getDailyMaterialMoves()` returns a hardcoded static mock array and is invoked without the live dashboard data payload.
- In `SafeHavenTechnicals.tsx`, default support and resistance fallbacks are hardcoded to `'$2,600'` and `'$2,700'` and source to `'LBMA / FRED'`.
- In `HistoricalComparisonSidebar.tsx`, the Current Cycle Fed Funds value is hardcoded to `'3.88% (cuts begun)'` with sparkline point `3.88`.
- In `RecessionPlaybookModal.tsx`, Stage 1 table lists Fed Funds at `3.88%`.
- In `macro_indicators_agent`, prompt does not inject explicit verified values from ground truth as mandatory constraints.

Baseline Checks Run:
- `npm test -- --run`: Passed 16/16 tests across 5 files in 8.99s.
- `venv\Scripts\python.exe -m pytest tests/`: Passed 7/7 tests across 2 files in 16.25s.
- Branch Gate: Confirmed active branch is `develop`.

Post-Implementation Checks & Verification:
- `npm test -- --run`: Passed 17/17 tests across 5 files in 9.31s (added dynamic mover extraction and calibrated baseline tests).
- `npm run build`: Passed, Vite production bundle generated in 1.80s.
- `venv\Scripts\python.exe -m pytest tests/`: Passed 7/7 tests in 12.22s.
- UI Indicator Validation:
  - 'What Changed Since Yesterday' in TopIntelligenceBar: Gold Spot renders calibrated at $4,132/oz and Fed Funds at 3.75%, dynamically updating when backend payload arrives.
  - SafeHavenTechnicals: Gold spot fallback is $4,132.30, with dynamic support ($4,090) and resistance ($4,170) and source 'Yahoo Finance (GC=F) / LBMA'.
  - HistoricalComparisonSidebar: Fed Funds rate set to 3.75% (cuts begun) and sparkline endpoint 3.75.
  - RecessionPlaybookModal: Effective Fed Funds updated to 3.75%.
  - Calendar: Official central bank benchmarks (FED 3.75%, ECB 2.50%, BOE 3.73%, BOJ 0.30%) applied as fallbacks.
  - MacroIndicators sub-agent: Prompt grounded with mandatory verified numbers, and aggregator defaults missing fields from ground truth.

## T9 Feature Delivery Baseline - 2026-10-07

Impacted scope:
- Official FRED Unemployment Rate (`UNRATE` / Sahm Rule indicator) across backend ground truth, models, prompts, aggregator defaults, and frontend presentation views (`HistoricalComparisonSidebar`, `ExecutiveSummaryPanel`, `RecessionPlaybookModal`, `TopIntelligenceBar`).

Pre-Change Observations:
- FRED official benchmark `UNRATE` is currently **4.2%** (September 2026), but `4.0%` is hardcoded across multiple views and fallbacks:
  - In `HistoricalComparisonSidebar.tsx`, the Current Cycle indicator displays `valNow: '4.0% (watch ≥ 4.3%)'`.
  - In `RecessionPlaybookModal.tsx`, Stage 2 & Sahm Rule indicator is hardcoded to `'4.0%'` in `currentVal`, in the reference table (`4.0%`), and in the 2D Shock Catalysts matrix table (`4.0%`).
  - In `ExecutiveSummaryPanel.tsx`, Trigger 1 states `Unemployment rate rises above 4.3% (Current: 4.0%)`.
  - In `fred_tool.py`, `_get_mock_value` has `"UNRATE": 4.0` and `get_executive_summary` has `(Current: 4.0%)`.
  - In `models.py`, `ExecutiveSummary` trigger default has `(Current: 4.0%)`.
  - In `TopIntelligenceBar.tsx` and `App.tsx`, `unrate` default prop is `4.0`, and `App.tsx` does not dynamically forward the live unemployment rate from `data?.macro_indicators`.

Baseline Checks Run:
- `npm test -- --run`: Passed 17/17 tests across 5 files in 8.55s.
- `venv\Scripts\python.exe -m pytest tests/`: Passed 7/7 tests across 2 files in 13.07s.
- Branch Gate: Confirmed active branch is `develop`.

Post-Implementation Checks & Verification:
- `npm test -- --run`: Passed 17/17 tests across 5 files in 33.38s (verified HistoricalComparisonSidebar checks '4.2% (watch ≥ 4.3%)').
- `npm run build`: Passed, Vite production bundle generated in 9.61s.
- `venv\Scripts\python.exe -m pytest tests/`: Passed 8/8 tests in 16.28s (added `test_unemployment_rate_is_calibrated_to_4_point_2`).
- UI Validation:
  - HistoricalComparisonSidebar displays '4.2% (watch ≥ 4.3%)'.
  - ExecutiveSummaryPanel tripwire displays '(Current: 4.2%)'.
  - RecessionPlaybookModal displays 4.2% in transmission cards, reference table, and 2D shock catalyst matrix.
  - TopIntelligenceBar receives live/calibrated 4.2% unemployment rate for regime probability calculation.

## T10 Feature Delivery Baseline - 2026-10-07

Impacted scope:
- Core Key Gauges section in `src/frontend/src/App.tsx`: Layout rearrangement of credit distress indicators (`Avg Mid-Cap ICR`, `PIK Issuance`, `CRE Delinquency`) and unification/enhancement of `Systemic Stress Risk Gauge` with plain-language interpretation and risk bands.

Pre-Change Observations:
- In `App.tsx`, the Core Key Gauges panel currently uses a 2x2 grid:
  - Cell 1: `Risk Sentiment` (MetricBig showing `riskScore` /10).
  - Cell 2: `Avg Mid-Cap ICR` (MetricBig).
  - Cell 3: `PIK Issuance` (MetricBig).
  - Cell 4: `CRE Delinquency` (MetricBig).
  - Bottom row: `Systemic Stress Risk Gauge` displaying `<RiskGauge>` (also showing `riskScore` /10).
- Redundancy & Confusion:
  - The user questions whether the Systemic Stress Risk Gauge is really needed because `Risk Sentiment` and `Systemic Stress Risk Gauge` both display the same 5.0/10 score without explaining why both exist or what systemic stress actually means.
  - `PIK Issuance` is currently in column 1 while `Avg Mid-Cap ICR` and `CRE Delinquency` are in column 2, disrupting the logical credit progression.
  - The `Systemic Stress Risk Gauge` box has zero plain-language guidance explaining how to make sense of the reading (e.g. 5.0/10 Moderate/Alert, 1-3 Stable, 7-10 Crisis).

Baseline Checks Run:
- `npm test -- --run`: Passed 18/18 tests across 5 files.
- `venv\Scripts\python.exe -m pytest tests/`: Passed 8/8 tests across 2 files.
- Branch Gate: Confirmed active branch is `develop`.

## T12 Feature Delivery Baseline - 2026-10-07

Impacted scope:
- Layout relocation of `HistoricalComparisonSidebar` in `src/frontend/src/App.tsx` to position underneath the Avg Mid-Cap ICR, PIK Issuance, and CRE Delinquency metrics.
- Full-width expansion of `MacroCorrelationsPanel`.
- Phrasing update from "YOU ARE HERE" / "You Are Here" to "WE ARE HERE" across `RiskGauge.tsx`, `RecessionPlaybookModal.tsx`, and associated unit tests.

Pre-Change Observations:
- In `App.tsx`, `HistoricalComparisonSidebar` is positioned alongside `MacroCorrelationsPanel` in a 2-column grid (`xl:grid-cols-[1.7fr_1fr]`).
- In `App.tsx`, the Core Key Gauges container ends after the 3 credit metric boxes (ICR, PIK, CRE).
- In `RiskGauge.tsx`, the indicator pin displays `YOU ARE HERE ({clampedScore.toFixed(1)})`.
- In `RecessionPlaybookModal.tsx`, the active Stage 1 pin displays `YOU ARE HERE`.
- In `MacroIntelligenceEnhancements.test.tsx`, tests specifically assert regex `/YOU ARE HERE/i`.

Baseline Checks Run:
- `npm test -- --run`: Passed 20/20 tests across 5 files.
- `venv\Scripts\python.exe -m pytest tests/`: Passed 8/8 tests across 2 files.
- Branch Gate: Confirmed active branch is `develop`.



