import asyncio
import json
import time

import pytest

from backend import agent
from backend.providers import get_default_provider_name, normalize_provider_name


def _valid_calendar() -> dict:
    return {"dates": [], "rates": [], "g7_rates_summary": []}


def _valid_risk() -> dict:
    return {
        "score": 6.5,
        "summary": "Risk stable",
        "contagion_analysis": "Contained",
        "crypto_contagion": {
            "summary": "Limited spillover",
            "market_cap": "2T",
            "assets": [
                {"name": "BTC", "price": "65000"},
                {"name": "ETH", "price": "3200"},
            ],
        },
    }


def _valid_credit() -> dict:
    return {
        "mid_cap_avg_icr": 2.1,
        "sectoral_breakdown": [],
        "pik_debt_issuance": "Moderate",
        "cre_delinquency_rate": "2.0%",
        "mid_cap_hy_oas": "410bps",
        "cp_spreads": "65bps",
        "vix_of_credit_cdx": "31",
        "watchlist": [],
        "alert": False,
    }


def _valid_strategy() -> dict:
    return {"events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []}


def test_provider_defaults_to_nvidia_when_missing_name():
    assert get_default_provider_name() == "Nvidia"
    assert normalize_provider_name("") == "Nvidia"
    assert normalize_provider_name(None) == "Nvidia"


def test_provider_validation_rejects_unknown_provider():
    with pytest.raises(ValueError):
        normalize_provider_name("NotAProvider")


def test_aggregator_preserves_crypto_contagion():
    state = {
        "provider_name": "Nvidia",
        "is_cloud_provider": True,
        "aggregated_research": "",
        "calendar_data": _valid_calendar(),
        "risk_data": _valid_risk(),
        "credit_data": _valid_credit(),
        "strategy_data": _valid_strategy(),
        "dashboard_data": None,
        "raw_responses": [],
    }

    dashboard = agent.aggregator_node(state)["dashboard_data"]
    assert dashboard.crypto_contagion is not None
    assert dashboard.crypto_contagion.summary == "Limited spillover"


def test_parallel_orchestration_runs_concurrently(monkeypatch):
    async def slow_calendar(state):
        await asyncio.sleep(0.2)
        return {"calendar_data": _valid_calendar(), "raw_responses": ["ok-calendar"]}

    async def slow_risk(state):
        await asyncio.sleep(0.2)
        return {"risk_data": _valid_risk(), "raw_responses": ["ok-risk"]}

    async def slow_credit(state):
        await asyncio.sleep(0.2)
        return {"credit_data": _valid_credit(), "raw_responses": ["ok-credit"]}

    async def slow_strategy(state):
        await asyncio.sleep(0.2)
        return {"strategy_data": _valid_strategy(), "raw_responses": ["ok-strategy"]}

    monkeypatch.setattr(agent, "calendar_agent", slow_calendar)
    monkeypatch.setattr(agent, "risk_agent", slow_risk)
    monkeypatch.setattr(agent, "credit_agent", slow_credit)
    monkeypatch.setattr(agent, "strategy_agent", slow_strategy)

    state = agent._build_initial_state("Nvidia")
    start = time.perf_counter()
    updates, status, _, failed = asyncio.run(agent._run_parallel_sections(state))
    elapsed = time.perf_counter() - start

    assert elapsed < 0.45
    assert failed == set()
    assert all(status.values())
    assert updates["risk_data"]["score"] == 6.5


def test_stream_partial_failure_does_not_trigger_full_fallback(monkeypatch):
    async def fake_researcher(state):
        return {"aggregated_research": "mock"}

    async def fake_run_parallel(state):
        updates = {
            "calendar_data": _valid_calendar(),
            "risk_data": None,
            "credit_data": _valid_credit(),
            "strategy_data": _valid_strategy(),
        }
        status = {"calendar": True, "risk": False, "credit": True, "strategy": True}
        return updates, status, ["Error in Risk after 3 attempts"], {"risk"}

    monkeypatch.setattr(agent, "researcher_node", fake_researcher)
    monkeypatch.setattr(agent, "_run_parallel_sections", fake_run_parallel)
    monkeypatch.setattr(agent, "_save_cache", lambda *_args, **_kwargs: None)

    chunks = asyncio.run(_collect_stream(agent.stream_macro_dashboard("Nvidia", skip_cache=True)))
    payloads = [json.loads(chunk) for chunk in chunks]
    final_payload = payloads[-1]

    assert final_payload["status"] == "analysis_complete"
    assert "message" not in final_payload or "fallback" not in final_payload.get("message", "").lower()
    assert final_payload["data"]["risk"]["summary"] == "No data - API failed"


async def _collect_stream(stream):
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return chunks
