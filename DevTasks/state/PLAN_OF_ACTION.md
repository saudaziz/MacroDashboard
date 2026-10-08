# Plan Of Action

## Branch Gate
- Current working branch: `develop`
- Branch decision: Working strictly on `develop` branch, synchronized with `origin/develop`.

## Current Owner
- Owner: Developer (Executing T11)
- Active task: T11 - Linear Systemic Stress Gauge with Scale Points & Side-by-Side Credit Metrics
- Next step: Implement linear graph scale in RiskGauge.tsx and layout rearrangement in App.tsx.

## Scope
- T11.1: Redesign `RiskGauge` to feature a linear multi-level bar scale with points/markers for different stress zones (0-3.9 Calm, 4.0-6.9 Moderate, 7.0-10.0 Crisis) and a dynamic "YOU ARE HERE" indicator.
- T11.2: Restructure the Core Key Gauges section in `App.tsx` so that `Systemic Stress Risk Gauge` occupies the full top portion, and `Avg Mid-Cap ICR`, `PIK Issuance`, and `CRE Delinquency` are positioned below side-by-side in a 3-column row.
- T11.3: Make the "Why we track this gauge" and interpretation explanation collapsible/expandable via an accessible toggle button.
- T11.4: Update unit tests in Vitest and verify all test suites and Vite build.

## Outcome
- T1 completed: Metric tooltips accessible and tested.
- T2 completed: OpenRouter authentication failure root-caused.
- T3 completed: Gemini list-part response failure root-caused.
- T4 completed: Gemini response normalization and quota detection implemented.
- T5 completed: Executive summary, 5yr correlations, recession playbook modal, safe-haven formatters, gold technicals, and attribution by Saud Aziz merged into main.
- T6 completed: Regime Probability Gauge, 'What Changed Yesterday' strip, 3-Recession Sidebar, tightened stages, and Shock Catalysts 2D matrix merged and pushed on develop.
- T7 completed: Live market data grounding adapter and accurate CPI YoY calculation implemented and tested.
- T8 completed: Frontend and agent indicator grounding unified across all views and models (Gold $4,132/oz, Fed Funds 3.75%, CPI 3.35%, CB rates) verified with 17/17 Vitest and 7/7 Pytest tests passing.
- T9 completed: Official unemployment rate (4.2%) unified across backend ground truth, models, prompts, aggregator defaults, and frontend views, verified with 17/17 Vitest and 8/8 Pytest tests passing.
- T10 completed: Core Gauges layout rearranged with PIK Issuance under ICR and CRE Delinquency under PIK; Systemic Stress Risk Gauge unified and enriched with plain-language guidance, verified with 19/19 Vitest and 8/8 Pytest tests passing.
- T11 in progress: Linear Systemic Stress Gauge with scale points, side-by-side credit metrics, and collapsible guidance.
