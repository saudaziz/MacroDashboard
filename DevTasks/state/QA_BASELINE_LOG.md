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
