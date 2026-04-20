import asyncio
import json

from backend import agent


def test_stream_skip_cache_bypasses_cache(monkeypatch):
    monkeypatch.setattr(agent, "_load_daily_cache", lambda *_args, **_kwargs: {"dashboard_data": {"cached": True}})

    async def fake_researcher(state):
        return {"aggregated_research": "mock"}

    async def fake_run_parallel(state):
        updates = {
            "calendar_data": {"dates": [], "rates": [], "g7_rates_summary": []},
            "risk_data": {"score": 5, "summary": "ok"},
            "credit_data": {
                "mid_cap_avg_icr": 1.5,
                "sectoral_breakdown": [],
                "pik_debt_issuance": "N/A",
                "cre_delinquency_rate": "N/A",
                "mid_cap_hy_oas": "N/A",
                "cp_spreads": "N/A",
                "vix_of_credit_cdx": "N/A",
                "watchlist": [],
                "alert": False,
            },
            "strategy_data": {"events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []},
        }
        status = {"calendar": True, "risk": True, "credit": True, "strategy": True}
        return updates, status, [], set()

    monkeypatch.setattr(agent, "researcher_node", fake_researcher)
    monkeypatch.setattr(agent, "_run_parallel_sections", fake_run_parallel)
    monkeypatch.setattr(agent, "_save_cache", lambda *_args, **_kwargs: None)

    chunks = asyncio.run(_collect_stream(agent.stream_macro_dashboard("Qwen 2.5 Coder", skip_cache=True)))
    payloads = [json.loads(chunk) for chunk in chunks]
    assert payloads[0]["message"].startswith("Orchestrating agents")


async def _collect_stream(stream):
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return chunks
