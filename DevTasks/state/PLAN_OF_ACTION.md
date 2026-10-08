# Plan Of Action

## Branch Gate
- Current working branch: `develop`
- Branch decision: Working strictly on `develop` branch, synchronized with `origin/develop`.

## Current Owner
- Owner: None (All current tasks complete)
- Active task: None
- Next step: Ready for user instructions or merge to main.

## Scope
- T8.1: Update `getDailyMaterialMoves` in `src/frontend/src/utils/formatters.ts` to extract live Gold, Fed Funds, BTC, and spread from `DashboardData`, calibrating fallbacks to live figures ($4,132/oz, 3.75%, $83,200).
- T8.2: Wire `data` from `App.tsx` into `TopIntelligenceBar` so "What Changed Since Yesterday" uses live backend data.
- T8.3: Calibrate `SafeHavenTechnicals.tsx` support/resistance fallbacks relative to live spot price and update source label.
- T8.4: Update `HistoricalComparisonSidebar.tsx` and `RecessionPlaybookModal.tsx` current Fed Funds to 3.75% and update sparkline.
- T8.5: Ground `macro_indicators_agent` prompt in `agent.py` with mandatory official ground truth and anchor aggregator fallbacks.
- T8.6: Update unit tests in frontend and backend test suites, verifying 100% pass rate.

## Outcome
- T1 completed: Metric tooltips accessible and tested.
- T2 completed: OpenRouter authentication failure root-caused.
- T3 completed: Gemini list-part response failure root-caused.
- T4 completed: Gemini response normalization and quota detection implemented.
- T5 completed: Executive summary, 5yr correlations, recession playbook modal, safe-haven formatters, gold technicals, and attribution by Saud Aziz merged into main.
- T6 completed: Regime Probability Gauge, 'What Changed Yesterday' strip, 3-Recession Sidebar, tightened stages, and Shock Catalysts 2D matrix merged and pushed on develop.
- T7 completed: Live market data grounding adapter and accurate CPI YoY calculation implemented and tested.
- T8 completed: Frontend and agent indicator grounding unified across all views and models (Gold $4,132/oz, Fed Funds 3.75%, CPI 3.35%, CB rates) verified with 17/17 Vitest and 7/7 Pytest tests passing.
