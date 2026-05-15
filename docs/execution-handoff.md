# MacroDashboard Execution Handoff (Canonical)

## Branch and Date
- Branch: `develop`
- Started: 2026-05-15
- Workflow: Architect -> Developer -> Architect Validation -> QA Closeout

## Replaced Prior Planning Artifacts
- Removed: `improvements.md`
- Canonical plan file: `docs/execution-handoff.md` (this file)

## QA Baseline (Pre-change)
- UI smoke (`npm run test:e2e`): pass
- Frontend unit (`npm test`): failing validator case in `src/frontend/src/api.test.ts`
- Backend generation pre-existing failures:
  - `Demo`: `Demo data not available.`
  - `OpenRouter`/`Ollama`: `No module named 'fred_tool'`
- Cancel active-run happy-path not observed due quick upstream failure
- Resume endpoint reachable but full HITL flow blocked by generation failures

## Architect Task Set (Approved for Execution)
- `T1` Authn/Authz for mutation endpoints
- `T2` CORS hardening with explicit allowlist
- `T3` Run-scoped cancellation and HITL isolation
- `T4` Debug payload exposure control
- `T5` Fallback provenance and semantics hardening
- `T6` Strict validation boundary (frontend fail-closed)

## Acceptance-Criteria Gate
- T1: Unauthenticated mutation requests return `401/403` (or `503` if auth config missing by policy)
- T2: No wildcard CORS; untrusted preflight rejected
- T3: No cross-run cancel/resume interference
- T4: Raw/reasoning fields not exposed by default
- T5: Fallback is visibly labeled and persisted with provenance
- T6: Malformed critical payloads rejected (`null`), no silent synthesis

## Execution Log
### Completed
- [x] Planning reset completed (canonical file established)
- [x] Architect breakdown captured with testable acceptance criteria
- [x] Developer implementation plan captured
- [x] QA baseline captured

### In Progress
- [~] T1/T2 implementation started
  - Backend:
    - Added API-key guard for mutation endpoints in `src/backend/api/main.py`
    - Replaced wildcard CORS with env-configured allowlists in `src/backend/api/main.py`
    - Added deterministic backend `.env` loading from `src/backend/.env` in `src/backend/core/env_loader.py`
  - Frontend:
    - Added optional `X-API-Key` header wiring via `VITE_MACRO_API_KEY` in `src/frontend/src/config.ts` and `src/frontend/src/api.ts`

### Pending
- [ ] Architect validation of T1/T2 acceptance criteria
- [ ] QA regression pass for T1/T2
- [ ] T3 implementation
- [ ] T4 implementation
- [ ] T5 implementation
- [ ] T6 implementation

## Resume Instructions (Next Session)
1. Open this file first: `docs/execution-handoff.md`
2. Run:
   - `git branch --show-current`
   - `git status --short --branch`
3. Continue from section `In Progress`.
4. Validate T1/T2 using backend mutation endpoint auth checks and CORS origin matrix.
5. If T1/T2 accepted by Architect gate, hand to QA for regression checklist before starting T3.

### Update 2026-05-15 (T1/T2 hardening pass 2)
- Fixed Architect blockers:
  - Added `X-API-Key` to default CORS allow headers.
  - Removed bundled `VITE_*` API key usage from frontend config.
  - Frontend now supports optional runtime-only key from `sessionStorage['macro_api_key']`.
  - Added explicit policy doc: `docs/api-auth-policy.md`.
- Validation snapshot:
  - `GET /api/status` -> 200
  - `GET /api/providers` -> 200
  - Unauthenticated protected POST endpoints -> 503 (fail-closed when `MACRO_API_KEY` not configured)

### Closure Update 2026-05-15
- Architect validation: `T1` PASS, `T2` PASS
- QA validation: `T1` PASS, `T2` PASS
- Task closure:
  - [x] T1 Authn/Authz baseline for mutation endpoints
  - [x] T2 CORS hardening with explicit allowlist
  - [ ] T3 Run-scoped cancellation and HITL state isolation
  - [ ] T4 Debug payload exposure control
  - [ ] T5 Fallback semantics tightening
  - [ ] T6 Strict validation boundary

### T3 Progress Update 2026-05-15
- Implemented run-scoped orchestration plumbing:
  - Added `run_id` to backend mutation request contracts (`stream`, `generate`, `cancel`, `resume`).
  - Replaced single global stream task with run-scoped `active_stream_tasks` map in API layer.
  - Migrated HITL from global event/data to run-scoped state map in agent layer.
  - Added run-scoped cleanup after orchestration completion/error.
  - Wired frontend to generate a per-request UUID run id and pass it in stream/cancel/resume calls.
- Validation snapshot:
  - Backend: `cancel` without body now `422`; with unknown run id returns `404`; `resume` with run id returns `200`.
  - Frontend tests: existing pre-baseline validator test still failing (`src/frontend/src/api.test.ts` malformed payload expected null).

### Closure Update 2026-05-15 (T4)
- Architect validation: `T4` PASS
- QA validation: `T4` PASS
- Task closure:
  - [x] T1 Authn/Authz baseline for mutation endpoints
  - [x] T2 CORS hardening with explicit allowlist
  - [x] T3 Run-scoped cancellation and HITL state isolation
  - [x] T4 Debug payload exposure control
  - [ ] T5 Fallback semantics tightening
  - [ ] T6 Strict validation boundary
