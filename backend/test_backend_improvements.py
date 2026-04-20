import asyncio
import json
import time

import pytest

from backend import agent
from backend.models import MacroDashboardResponse
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


def test_provider_defaults_to_qwen_when_missing_name():
    assert get_default_provider_name() == "Qwen 2.5 Coder"
    assert normalize_provider_name("") == "Qwen 2.5 Coder"
    assert normalize_provider_name(None) == "Qwen 2.5 Coder"


def test_provider_validation_rejects_unknown_provider():
    with pytest.raises(ValueError):
        normalize_provider_name("NotAProvider")


def test_aggregator_preserves_crypto_contagion():
    state = {
        "provider_name": "Qwen 2.5 Coder",
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


def test_dashboard_validation_coerces_numeric_crypto_asset_fields():
    payload = {
        "generated_at": "2026-04-20T00:00:00Z",
        "calendar": _valid_calendar(),
        "risk": {"score": 5, "summary": "Stable"},
        "crypto_contagion": {
            "summary": "Numeric values from model output",
            "market_cap": 2000000000000,
            "assets": [
                {"name": "BTC", "price": 35000, "change_24h": -2.5, "change_7d": -10.0},
                {"name": "ETH", "price": 2500, "change_24h": -3.0, "change_7d": -12.0},
            ],
        },
        "credit": _valid_credit(),
        "events": [],
        "portfolio_suggestions": [],
        "risk_mitigation_steps": [],
    }

    dashboard = MacroDashboardResponse.model_validate(payload)
    assert dashboard.crypto_contagion is not None
    first_asset = dashboard.crypto_contagion.assets[0]
    assert first_asset.price == "35000"
    assert first_asset.change_24h == "-2.5"
    assert first_asset.change_7d == "-10.0"


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

    state = agent._build_initial_state("Qwen 2.5 Coder")
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

    chunks = asyncio.run(_collect_stream(agent.stream_macro_dashboard("Qwen 2.5 Coder", skip_cache=True)))
    payloads = [json.loads(chunk) for chunk in chunks]
    final_payload = payloads[-1]

    assert final_payload["status"] == "analysis_complete"
    assert "message" not in final_payload or "fallback" not in final_payload.get("message", "").lower()
    assert final_payload["data"]["risk"]["summary"] == "No data - API failed"


def test_aggregator_recovers_from_malformed_nested_payloads():
    state = {
        "provider_name": "Qwen 2.5 Coder",
        "is_cloud_provider": True,
        "aggregated_research": "",
        "calendar_data": {"dates": "bad", "rates": {}},
        "risk_data": {"score": "NaN", "summary": 123, "crypto_contagion": {"assets": [{"name": "BTC", "price": {"x": 1}}]}},
        "credit_data": {"mid_cap_avg_icr": "not-number"},
        "strategy_data": {
            "events": [{"title": "ok", "description": "desc", "potential_impact": 123}, {"bad": "event"}],
            "portfolio_suggestions": [{"asset_class": "Bonds", "percentage": 30, "rationale": "safe"}, {"bad": "row"}],
            "risk_mitigation_steps": ["Step 1", 2, {"k": "v"}],
        },
        "dashboard_data": None,
        "raw_responses": [],
    }

    dashboard = agent.aggregator_node(state)["dashboard_data"]
    assert dashboard is not None
    assert dashboard.calendar is not None
    assert dashboard.risk is not None
    assert dashboard.credit is not None
    assert isinstance(dashboard.risk_mitigation_steps, list)


def test_aggregator_normalizes_calendar_alternate_shapes():
    state = {
        "provider_name": "Qwen 2.5 Coder",
        "is_cloud_provider": True,
        "aggregated_research": "",
        "calendar_data": {
            "events": [
                {
                    "event": "CPI",
                    "next_date": "2026-05-01",
                    "consensus": "0.3%",
                    "actual": "0.2%",
                }
            ],
            "policy_rates": [
                {
                    "bank": "Federal Reserve",
                    "rate": 5.25,
                    "guidance": "Data dependent",
                    "next_date": "2026-06-15",
                }
            ],
        },
        "risk_data": _valid_risk(),
        "credit_data": _valid_credit(),
        "strategy_data": _valid_strategy(),
        "dashboard_data": None,
        "raw_responses": [],
    }

    dashboard = agent.aggregator_node(state)["dashboard_data"]
    assert len(dashboard.calendar.dates) == 1
    assert len(dashboard.calendar.rates) == 1
    assert dashboard.calendar.rates[0].bank == "Federal Reserve"


def test_aggregator_normalizes_sparse_risk_and_credit_shapes():
    state = {
        "provider_name": "Qwen 2.5 Coder",
        "is_cloud_provider": True,
        "aggregated_research": "",
        "calendar_data": _valid_calendar(),
        "risk_data": {"score": "NaN", "label": "Elevated"},
        "credit_data": {"mid_cap_avg_icr": "not-number"},
        "strategy_data": _valid_strategy(),
        "dashboard_data": None,
        "raw_responses": [],
    }

    dashboard = agent.aggregator_node(state)["dashboard_data"]
    assert dashboard.risk.score == 5
    assert dashboard.risk.summary == "Elevated"
    assert dashboard.credit.mid_cap_avg_icr == 0
    assert dashboard.credit.pik_debt_issuance == "N/A"


def test_json_payload_parser_handles_fenced_and_trailing_text():
    content = """```json
{"a": 1, "b": [1, 2, 3]}
```
extra text"""
    parsed, raw = agent._try_parse_json_payload(content)
    assert parsed == {"a": 1, "b": [1, 2, 3]}
    assert raw.startswith("{")


async def _collect_stream(stream):
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return chunks
