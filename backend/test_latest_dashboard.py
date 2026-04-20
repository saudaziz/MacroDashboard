import json

from fastapi.testclient import TestClient

from backend import agent, main


def test_load_latest_dashboard_round_trip(tmp_path, monkeypatch):
    latest_file = tmp_path / "latest_dashboard.json"
    monkeypatch.setattr(agent, "_LATEST_CACHE_PATH", latest_file)

    payload = {
        "provider": "Qwen 2.5 Coder",
        "date": "2026-04-20",
        "timestamp": 1,
        "dashboard_data": {
            "generated_at": "2026-04-20T00:00:00Z",
            "calendar": {"dates": [], "rates": [], "g7_rates_summary": []},
            "risk": {"score": 5, "summary": "ok"},
            "crypto_contagion": None,
            "credit": {
                "mid_cap_avg_icr": 1.2,
                "sectoral_breakdown": [],
                "pik_debt_issuance": "low",
                "cre_delinquency_rate": "1%",
                "mid_cap_hy_oas": "100",
                "cp_spreads": "10",
                "vix_of_credit_cdx": "50",
                "watchlist": [],
                "alert": False,
            },
            "events": [],
            "portfolio_suggestions": [],
            "risk_mitigation_steps": [],
        },
        "raw_response": "raw",
    }
    latest_file.write_text(json.dumps(payload), encoding="utf-8")

    loaded = agent._load_latest_dashboard()
    assert loaded is not None
    assert loaded["provider"] == "Qwen 2.5 Coder"


def test_latest_dashboard_endpoint(monkeypatch):
    sample_payload = {"provider": "Qwen 2.5 Coder", "dashboard_data": {"risk": {"score": 5, "summary": "ok"}}}
    monkeypatch.setattr(main, "_load_latest_dashboard", lambda: sample_payload)

    client = TestClient(main.app)
    response = client.get("/api/latest-dashboard")
    assert response.status_code == 200
    assert response.json() == sample_payload
