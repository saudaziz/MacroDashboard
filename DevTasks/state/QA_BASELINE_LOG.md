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
