"""Live readings for the Recession Playbook popup.

Unlike FREDClient.get_series_latest, this module never substitutes mock values. A series that cannot be
fetched is reported as unavailable, so the UI can say so instead of showing a made-up number.
"""

import logging
import time
from datetime import date, timedelta
from typing import Any, Optional

from .fred_tool import FREDClient

logger = logging.getLogger("PlaybookData")

CACHE_TTL_SECONDS = 15 * 60
LOOKBACK_YEARS = 4

# Playbook key -> FRED series id
PLAYBOOK_SERIES: dict[str, str] = {
    "fed_target_lower": "DFEDTARL",
    "fed_target_upper": "DFEDTARU",
    "dff": "DFF",
    "dgs10": "DGS10",
    "dgs2": "DGS2",
    "t10y2y": "T10Y2Y",
    "vix": "VIXCLS",
    "unrate": "UNRATE",
    "hy_oas": "BAMLH0A0HYM2",
    "nfci": "NFCI",
    "icsa": "ICSA",
    "sloos": "DRTSCILM",
    "umcsent": "UMCSENT",
}

_cache: dict[str, Any] = {"at": 0.0, "payload": None}


def compute_sahm_gap(monthly_unemployment: list[float]) -> Optional[float]:
    """Sahm gap: current 3-month average minus the lowest 3-month average of the prior 12 months.

    Needs at least 15 monthly observations (oldest first). Returns None when history is too short.
    """
    three_month = [
        sum(monthly_unemployment[i - 2 : i + 1]) / 3.0 for i in range(2, len(monthly_unemployment))
    ]
    if len(three_month) < 13:
        return None
    current = three_month[-1]
    prior_low = min(three_month[-13:-1])
    return round(current - prior_low, 4)


def compute_icsa_spike_pct(weekly_claims: list[float]) -> Optional[float]:
    """Percent by which the 4-week average claims sit above their lowest 4-week average of the prior 26 weeks.

    Needs at least 30 weekly observations (oldest first). Returns None when history is too short.
    """
    four_week = [
        sum(weekly_claims[i - 3 : i + 1]) / 4.0 for i in range(3, len(weekly_claims))
    ]
    if len(four_week) < 27:
        return None
    current = four_week[-1]
    prior_low = min(four_week[-27:-1])
    if prior_low <= 0:
        return None
    return round((current / prior_low - 1.0) * 100.0, 2)


def _series_values(fred: Any, series_id: str, start: date) -> list[tuple[str, float]]:
    data = fred.get_series(series_id, observation_start=start.isoformat()).dropna()
    return [(idx.date().isoformat(), float(val)) for idx, val in data.items()]


def _unavailable(reason: str) -> dict[str, Any]:
    return {
        "source": "unavailable",
        "reason": reason,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "readings": {key: {"value": None, "date": None, "series": sid} for key, sid in PLAYBOOK_SERIES.items()},
        "sahm_gap": {"value": None, "date": None},
        "icsa_spike_pct": {"value": None, "date": None},
    }


def _build_snapshot() -> dict[str, Any]:
    client = FREDClient()
    if client.fred is None:
        return _unavailable("FRED_API_KEY is not configured, so no live values can be shown.")

    start = date.today() - timedelta(days=365 * LOOKBACK_YEARS)
    readings: dict[str, dict[str, Any]] = {}
    fetched: dict[str, list[tuple[str, float]]] = {}
    errors: list[str] = []

    for key, sid in PLAYBOOK_SERIES.items():
        try:
            fetched[sid] = _series_values(client.fred, sid, start)
        except Exception as exc:  # network or API errors are reported per series, not hidden
            logger.error("Playbook series %s failed: %s", sid, exc)
            fetched[sid] = []
            errors.append(f"{sid}: {exc}")

    for key, sid in PLAYBOOK_SERIES.items():
        values = fetched.get(sid) or []
        if values:
            when, val = values[-1]
            readings[key] = {"value": val, "date": when, "series": sid}
        else:
            readings[key] = {"value": None, "date": None, "series": sid}

    unrate = [v for _, v in fetched.get("UNRATE", [])]
    icsa = [v for _, v in fetched.get("ICSA", [])]
    sahm = compute_sahm_gap(unrate)
    icsa_spike = compute_icsa_spike_pct(icsa)

    return {
        "source": "fred" if not errors else "partial",
        "reason": "; ".join(errors) if errors else None,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "readings": readings,
        "sahm_gap": {
            "value": sahm,
            "date": fetched["UNRATE"][-1][0] if fetched.get("UNRATE") else None,
        },
        "icsa_spike_pct": {
            "value": icsa_spike,
            "date": fetched["ICSA"][-1][0] if fetched.get("ICSA") else None,
        },
    }


def get_recession_playbook_snapshot() -> dict[str, Any]:
    """Cached snapshot. Cache is per process; a failed fetch is cached too, to avoid hammering FRED."""
    now = time.time()
    if _cache["payload"] is not None and now - _cache["at"] < CACHE_TTL_SECONDS:
        return _cache["payload"]
    payload = _build_snapshot()
    _cache["payload"] = payload
    _cache["at"] = now
    return payload
