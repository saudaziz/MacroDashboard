# Plan Of Action

## Branch Gate
- Current working branch: `develop`
- Branch decision: Working strictly on `develop` branch, synchronized with `origin/develop`.

## Current Owner
- Owner: QA / Architect
- Active task: T5 - Executive Summary, 5-Year Correlations, Recession Playbook Deep-Dive, Safe-Haven Formatting, and Browser Title by Saud Aziz
- Next step: All tasks closed, code verified, and pushed to GitHub on branch `develop`.

## Scope
- Deliver plain-English Executive Summary with traffic-light weather status, 3 pillars, and action checklist/tripwires.
- Build 5-year historical macro correlation visualizer (Treasury yields, 10Y-2Y yield curve spread, and CBOE VIX).
- Build Approach 1 Recession Playbook deep-dive modal featuring the 4-stage transmission sequence, real-time macro reading tables, and shock countdown horizons.
- Fix unformatted Contagion Analysis and USD Strength sections to cleanly parse and render structured cards, spot prices, key support/resistance levels, and drivers without raw JSON/dict strings.
- Fix Gold Technicals unavailable message by adding London fixing mock prices and structured JSON synthesizer.
- Set browser window title to "MacroDashboard by SaudAziz" in `index.html` and `App.tsx`.
- Add author branding "by Saud Aziz" across the top navbar, deep dive modal, executive summary card, and terminal footer.
- Check in and push all verified changes to GitHub on branch `develop`.

## Outcome
- T1 completed: Metric tooltips accessible and tested.
- T2 completed: OpenRouter authentication failure root-caused.
- T3 completed: Gemini list-part response failure root-caused.
- T4 completed: Gemini response normalization and quota detection implemented.
- T5 completed: Full executive summary, 5yr correlations, recession playbook modal, safe-haven formatters, gold technicals, browser title, and attribution by Saud Aziz verified across Vitest (10 tests), Vite build, Python tests, and pushed to GitHub on `develop`.
