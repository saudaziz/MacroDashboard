import json
import asyncio
from pathlib import Path
from fastapi.testclient import TestClient
from backend import agent, main


def test_save_and_load_latest_dashboard(monkeypatch, tmp_path):
    monkey_file = tmp_path / "latest_dashboard.json"
    monkeypatch.setattr(agent, "_LATEST_CACHE_PATH", monkey_file)

    dashboard_payload = {
        "calendar": {},
        "risk": {"score": 5, "summary": "OK", "contagion_analysis": "None", "gold_technical": None, "usd_technical": None},
        "credit": {"mid_cap_avg_icr": 1.1, "sectoral_breakdown": [], "pik_debt_issuance": "N/A", "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A", "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False},
        "events": [],
        "portfolio_suggestions": [],
        "risk_mitigation_steps": []
    }

    agent._save_latest_dashboard(
        provider_name="Ollama",
        dashboard_data=dashboard_payload,
        raw_response="raw output",
        llm_request="test request",
        token_stats={"request_tokens": 10},
    )

    loaded = agent._load_latest_dashboard()
    assert loaded is not None
    assert loaded["provider"] == "Ollama"
    assert loaded["dashboard_data"] == dashboard_payload
    assert loaded["raw_response"] == "raw output"
    assert loaded["llm_request"] == "test request"
    assert loaded["token_stats"]["request_tokens"] == 10


def test_stream_macro_dashboard_saves_latest_dashboard(monkeypatch, tmp_path):
    monkeypatch.setattr(agent, "_LATEST_CACHE_PATH", tmp_path / "latest_dashboard.json")

    async def fake_astream(initial_state):
        yield {"researcher": {"aggregated_research": "mock research"}}
        yield {"request_builder": {"llm_request": "prompt text", "request_tokens": 12}}

        class DummyDashboard:
            def model_dump(self):
                return {
                    "calendar": {},
                    "risk": {"score": 4, "summary": "Stable", "contagion_analysis": "None", "gold_technical": None, "usd_technical": None},
                    "credit": {"mid_cap_avg_icr": 1.4, "sectoral_breakdown": [], "pik_debt_issuance": "N/A", "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A", "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False},
                    "events": [],
                    "portfolio_suggestions": [],
                    "risk_mitigation_steps": []
                }

        yield {
            "analyst": {
                "dashboard_data": DummyDashboard(),
                "raw_response": "raw response",
                "llm_request": "prompt text",
                "token_stats": {"request_tokens": 12},
            }
        }

    monkeypatch.setattr(agent.macro_agent, "astream", fake_astream)

    async def run_stream():
        return [json.loads(chunk) for chunk in [chunk async for chunk in agent.stream_macro_dashboard("Ollama")]]

    outputs = asyncio.run(run_stream())
    assert any(item["status"] == "analysis_complete" for item in outputs)

    saved = json.loads((tmp_path / "latest_dashboard.json").read_text(encoding="utf-8"))
    assert saved["provider"] == "Ollama"
    assert saved["dashboard_data"]["risk"]["score"] == 4
    assert saved["raw_response"] == "raw response"


def test_latest_dashboard_endpoint(monkeypatch):
    sample_payload = {
        "provider": "Ollama",
        "dashboard_data": {
            "calendar": {},
            "risk": {"score": 5, "summary": "OK", "contagion_analysis": "None", "gold_technical": None, "usd_technical": None},
            "credit": {"mid_cap_avg_icr": 1.1, "sectoral_breakdown": [], "pik_debt_issuance": "N/A", "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A", "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False},
            "events": [],
            "portfolio_suggestions": [],
            "risk_mitigation_steps": []
        },
        "raw_response": "raw output",
        "llm_request": "cached request",
        "token_stats": {"request_tokens": 10}
    }

    monkeypatch.setattr(main, "_load_latest_dashboard", lambda: sample_payload)

    client = TestClient(main.app)
    response = client.get("/api/latest-dashboard")
    assert response.status_code == 200
    assert response.json() == sample_payload
