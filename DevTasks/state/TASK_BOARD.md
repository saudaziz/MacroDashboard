# Task Board

## T1 - Restore metric tooltip explanations

Status: Closed

### Acceptance Criteria
- Metric explanation icons render wherever `MetricBig.helpText` is provided.
- Hovering or focusing an explanation icon displays the help text in the app UI.
- The tooltip remains accessible through keyboard focus and screen-reader relationships.
- Focused tests cover tooltip visibility and absence when no help text is supplied.
- Existing frontend tests still pass.

### Evidence
- Changed `src/frontend/src/components/UIAtoms.tsx` to render a real tooltip panel for `MetricBig.helpText`.
- Added `src/frontend/src/components/UIAtoms.test.tsx` covering tooltip rendering and no-tooltip behavior.
- Updated `src/frontend/src/api.ts` with a TypeScript 6-compatible validated payload cast so production build verification passes.
- `npm test`: pass, 6 tests across 3 files.
- `npm run build`: pass.
- Playwright local UI check against `http://127.0.0.1:5173`: tooltip hidden before interaction, visible after hover, visible after focus.

### Architect Verification
- Passed. Implementation satisfies the acceptance criteria with focused component coverage and a browser-level interaction check.

### QA Validation
- Passed. Running frontend shows the metric explanation icon and displays the section explanation on hover/focus without regressing the existing page load.

## T2 - Investigate failed dashboard run

Status: Closed

### Acceptance Criteria
- Identify the latest failed run timestamp and failing endpoint.
- Correlate backend and frontend logs.
- Distinguish provider/model failures from UI rendering failures.
- Record root cause and next remediation.

### Evidence
- Latest failed run started at `2026-06-01 11:26:31` through `POST /api/stream-dashboard`.
- Backend accepted the frontend request and returned HTTP 200 for the SSE stream.
- FRED had secondary data issues: `Too Many Requests` for `FEDFUNDS` and `PCEPILFE`, plus missing FRED series `GOLDAMGBD228NLBM`.
- Primary failure: every OpenRouter sub-agent section (`Calendar`, `Risk`, `Credit`, `Strategy`, `MacroIndicators`) failed 5 attempts with OpenRouter `401 Unauthorized`.
- Error body from OpenRouter: `Missing Authentication header`.
- Aggregator then reported all provider sections missing and emitted the frontend-visible error: `All provider sections failed and no fallback available.`
- Frontend log at `11:26:59 AM`: `[Store] Received ERROR status from backend: All provider sections failed and no fallback available.`
- Config check: `OPENROUTER_API_KEY` is set but does not look like an OpenRouter `sk-...` key.
- Direct authenticated OpenRouter `/api/v1/credits` probe with the configured value also returned `401 Missing Authentication header`.

### Architect Verification
- Passed. Failure is provider authentication/configuration, not a React rendering issue.

### QA Validation
- Passed. Backend and frontend logs agree on the failure path and user-visible error.

### Recommended Remediation
- Set `OPENROUTER_API_KEY` to a real OpenRouter API key and keep `OPENROUTER_MODEL=google/gemini-3.1-flash-lite`, or implement a direct Google AI Studio provider that uses `GOOGLE_API_KEY` with `gemini-3.1-flash-lite`.

## T3 - Investigate Gemini failed dashboard run

Status: Closed

### Acceptance Criteria
- Identify whether the Gemini API key is rejected by Google or whether failure happens after the model call.
- Correlate backend and frontend logs for the latest Gemini run.
- Identify the concrete code path producing the repeated section failures.
- Record root cause and recommended remediation.

### Evidence
- Latest Gemini run started at `2026-06-01 11:54:59` through `POST /api/stream-dashboard`.
- Backend selected provider `Gemini` and initialized `GeminiProvider` with `GEMINI_MODEL=gemini-3.1-flash-lite-preview`.
- Google SDK logged `AFC is enabled`, proving the request reached the Gemini client rather than failing before auth.
- Direct smoke call using `GeminiProvider().get_model()` returned `OK`, proving the key/model path can call Gemini successfully.
- Direct smoke call returned `AIMessage.content` as a Python `list`: `[{'type': 'text', 'text': 'OK', ...}]`.
- Dashboard parser path in `src/backend/agents/agent.py` passes `response.content` into `_try_parse_json_payload(content)`, where `_try_parse_json_payload` calls `content.strip()`.
- Each dashboard section failed repeatedly with `'list' object has no attribute 'strip'`.
- Repeated parallel retries then hit Gemini free-tier quota: `429 RESOURCE_EXHAUSTED`, quota metric `generativelanguage.googleapis.com/generate_content_free_tier_requests`, limit `15`, model `gemini-3.1-flash-lite`.
- Frontend then reported `All provider sections failed and no fallback available.`

### Architect Verification
- Passed. The Gemini key is not the primary failure; the primary code defect is response-shape handling for Gemini list-part content. Quota exhaustion is a secondary effect from retries.

### QA Validation
- Passed. Backend and frontend logs agree on the failure path and final user-visible error.

### Recommended Remediation
- Normalize LLM response content before parsing: if `response.content` is a list of parts, extract/join text fields before calling `_try_parse_json_payload`.
- Apply the same normalization in the consistency-check path.
- Reduce Gemini parallelism/retry pressure or respect retry-after for `429 RESOURCE_EXHAUSTED` to avoid burning the free-tier request quota during parser failures.
- Decide whether to keep both `GEMINI_API_KEY` and `GOOGLE_API_KEY` set; the Google SDK logs that it chooses `GOOGLE_API_KEY` when both are present.

## T4 - Fix Gemini response normalization and retry handling

Status: Closed

### Acceptance Criteria
- Gemini/LangChain list-part responses are normalized to text before JSON parsing.
- The consistency-check path uses the same response normalization.
- Provider quota exhaustion stops retry loops instead of consuming more free-tier requests.
- `GEMINI_API_KEY` takes precedence over `GOOGLE_API_KEY` in the running process when both are configured.
- Focused backend tests cover list-part response parsing and quota detection.
- Backend compile checks and frontend tests still pass.

### Evidence
- Added `_message_content_to_text` in `src/backend/agents/agent.py` to normalize provider content, including Gemini list-part responses.
- Updated sub-agent parsing and consistency-check parsing to use normalized text.
- Added `_is_quota_error` and stopped section retries when provider quota is exhausted.
- Updated `GeminiProvider` in `src/backend/api/providers.py` so `GEMINI_API_KEY` wins over `GOOGLE_API_KEY` in the running process.
- Added `tests/test_agent_response_normalization.py`.
- `venv\Scripts\python.exe -m unittest tests.test_agent_response_normalization`: pass, 3 tests.
- `venv\Scripts\python.exe -m compileall -q src\backend tests`: pass.
- `npm test`: pass, 6 frontend tests.
- `npm run build`: pass.
- Live Gemini smoke: `AIMessage.content` returned as `list`, normalized to `{"ok": true}`, parsed as `{'ok': True}`.
- Backend restarted; `/api/providers` returns `Gemini`, `OpenRouter`, `Ollama Gemma`, `Demo`.

### Architect Verification
- Passed. The implementation directly addresses the root cause identified in T3 and has focused regression coverage.

### QA Validation
- Passed. Verification checks pass and the running backend is healthy. Full dashboard generation was not rerun to avoid consuming additional Gemini free-tier quota immediately after quota exhaustion.
