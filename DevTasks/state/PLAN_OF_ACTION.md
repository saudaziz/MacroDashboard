# Plan Of Action

## Branch Gate
- Current working branch: `develop`
- Branch decision: Working strictly on `develop` branch, synchronized with `origin/develop`.

## Current Owner
- Owner: None (All current tasks complete)
- Active task: None
- Next step: Ready for user instructions or merge to main.

## Scope
- T7.1: Build `MarketDataProvider` in `src/backend/core/market_data.py` for live Gold (`GC=F`) and live Crypto (Coinbase BTC, ETH, SOL).
- T7.2: Fix `get_series_yoy` in `src/backend/core/fred_tool.py` to use accurate 12-month offset and official FRED `pc1` percent-change transform.
- T7.3: Add Central Bank benchmark rate querying to FRED client (`FEDFUNDS`, `ECBDFR`, `IUDSOIA`, `INTDSRJPM193N`).
- T7.4: Inject live market data & central bank rates into `_fetch_ground_truth()` and wire to `risk_agent` & `calendar_agent` in `agent.py`.
- T7.5: Add unit tests in `tests/test_market_data.py` and run full regression test suites.

## Outcome
- T1 completed: Metric tooltips accessible and tested.
- T2 completed: OpenRouter authentication failure root-caused.
- T3 completed: Gemini list-part response failure root-caused.
- T4 completed: Gemini response normalization and quota detection implemented.
- T5 completed: Executive summary, 5yr correlations, recession playbook modal, safe-haven formatters, gold technicals, and attribution by Saud Aziz merged into main.
- T6 completed: Regime Probability Gauge, 'What Changed Yesterday' strip, 3-Recession Sidebar, tightened stages, and Shock Catalysts 2D matrix merged and pushed on develop.
- T7 completed: Live market data grounding (Gold ~$4,132/oz, Coinbase BTC/ETH/SOL, Central Bank policy rates, August CPI YoY 3.35%) implemented and verified with 7/7 Pytest and 16/16 Vitest tests passing.
