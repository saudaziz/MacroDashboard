import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, Optional, TypedDict

from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.messages import HumanMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("AgentOrchestrator")

load_dotenv()

try:
    from backend.models import MacroDashboardResponse
    from backend.providers import get_provider, normalize_provider_name
except ImportError:
    from models import MacroDashboardResponse
    from providers import get_provider, normalize_provider_name

# --- Retry Configuration ---
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 1.0
MAX_RETRY_DELAY = 10.0

# --- Cache Configuration ---
CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
_LATEST_CACHE_PATH = Path(__file__).resolve().parent / "latest_dashboard.json"
_FALLBACK_CACHE_PATH = Path(__file__).resolve().parent / "fallback_dashboard.json"
_SECTION_NAMES = ("calendar", "risk", "credit", "strategy")


class AgentState(TypedDict):
    provider_name: str
    is_cloud_provider: bool
    aggregated_research: str
    calendar_data: Optional[Dict[str, Any]]
    risk_data: Optional[Dict[str, Any]]
    credit_data: Optional[Dict[str, Any]]
    strategy_data: Optional[Dict[str, Any]]
    dashboard_data: Optional[MacroDashboardResponse]
    raw_responses: list[str]


def _load_daily_cache(provider_name: str) -> dict | None:
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = CACHE_DIR / f"{provider_name.lower().replace(' ', '_')}_{date_str}.json"
    if not path.exists():
        return None
    try:
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("date") == date_str:
            logger.info("Daily cache hit for %s on %s", provider_name, date_str)
            return cached
        logger.info("Daily cache stale for %s. Cached: %s, Current: %s", provider_name, cached.get("date"), date_str)
    except Exception as exc:
        logger.error("Cache load error: %s", exc)
    return None


def _save_cache(provider_name: str, dashboard_data: Any, raw_response: str) -> None:
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = CACHE_DIR / f"{provider_name.lower().replace(' ', '_')}_{date_str}.json"
    payload = {
        "provider": provider_name,
        "date": date_str,
        "timestamp": time.time(),
        "dashboard_data": dashboard_data,
        "raw_response": raw_response,
    }
    try:
        json_data = json.dumps(payload, indent=2)
        path.write_text(json_data, encoding="utf-8")
        _LATEST_CACHE_PATH.write_text(json_data, encoding="utf-8")
    except Exception as exc:
        logger.error("Cache save error: %s", exc)


def _load_fallback_dashboard() -> dict | None:
    if not _FALLBACK_CACHE_PATH.exists():
        return None
    try:
        fallback_json = json.loads(_FALLBACK_CACHE_PATH.read_text(encoding="utf-8"))
        fallback_json["generated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        return fallback_json
    except Exception as exc:
        logger.error("Failed to load fallback dashboard: %s", exc)
        return None


def _is_cloud(provider_name: str) -> bool:
    return provider_name.lower() in {"gemini", "claude", "nvidia", "bytedance"}


def _get_throttle_time(provider_name: str) -> float:
    if provider_name.lower() == "gemini":
        return float(os.getenv("GEMINI_THROTTLE_SEC", "5.0"))
    return 0.0


async def _call_sub_agent(state: AgentState, section: str, instruction: str) -> Dict[str, Any]:
    provider_name = state["provider_name"]
    logger.info("Sub-Agent [%s]: Invoking %s...", section, provider_name)

    if state["is_cloud_provider"]:
        delay = _get_throttle_time(provider_name)
        if delay > 0:
            logger.info("Throttling Cloud API: %ss delay...", delay)
            await asyncio.sleep(delay)

    prompt = (
        f"You are a specialized Macro Sub-Agent for: {section}.\n"
        f"{instruction}\n"
        f"{'RESEARCH CONTEXT:\n' + state.get('aggregated_research', '')[:5000] if not state['is_cloud_provider'] else ''}\n\n"
        "Return ONLY valid raw JSON. No markdown, no preamble."
    )

    last_error: Optional[str] = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.info("Sub-Agent [%s] Attempt %s/%s...", section, attempt + 1, MAX_RETRIES)
            provider = get_provider(provider_name)
            model = provider.get_model()

            response = await model.ainvoke([HumanMessage(content=prompt)])
            content = response.content if hasattr(response, "content") else str(response)

            json_match = re.search(r"(\{.*\})|(\[.*\])", content, re.DOTALL)
            clean_content = json_match.group(0) if json_match else content
            parsed = json.loads(clean_content)

            logger.info("Sub-Agent [%s] Success on attempt %s", section, attempt + 1)
            return {"data": parsed, "raw": clean_content}
        except json.JSONDecodeError as exc:
            last_error = f"JSON Parse Error: {exc}"
            logger.warning("Sub-Agent [%s] JSON parsing failed: %s", section, exc)
        except Exception as exc:
            last_error = str(exc)
            logger.warning("Sub-Agent [%s] Attempt %s failed: %s", section, attempt + 1, exc)
            if attempt < MAX_RETRIES - 1:
                delay = min(INITIAL_RETRY_DELAY * (2**attempt), MAX_RETRY_DELAY)
                logger.info("Sub-Agent [%s] Retrying in %.1fs...", section, delay)
                await asyncio.sleep(delay)

    logger.error("Sub-Agent [%s] Failed after %s attempts. Last error: %s", section, MAX_RETRIES, last_error)
    return {"data": None, "raw": f"Error in {section} after {MAX_RETRIES} attempts: {last_error}"}


async def researcher_node(state: AgentState) -> Dict[str, Any]:
    if state["is_cloud_provider"]:
        return {"aggregated_research": "[Cloud Tier: Internal Knowledge Base Active]"}

    logger.info("Researcher Agent: Scraping latest macro data...")
    search = DuckDuckGoSearchRun()
    queries = [
        "latest macro economic dates CPI PPI Jobs 2026",
        "G7 central bank rates guidance 2026",
        "credit spreads mid-cap ICR 2026",
    ]

    async def run_query(query: str) -> str:
        try:
            result = await asyncio.to_thread(search.run, query)
            return f"### {query}\n{result}"
        except Exception:
            return ""

    query_results = await asyncio.gather(*(run_query(query) for query in queries))
    return {"aggregated_research": "\n\n".join(result for result in query_results if result)}


async def calendar_agent(state: AgentState) -> Dict[str, Any]:
    instruction = (
        "Extract macro dates for CPI, PPI, Jobs, Retail Sales, FED, BOJ, BOE, ECB. "
        "For each date, include: 'event', 'last_date' (YYYY-MM-DD), 'last_period' (e.g. March 2026), "
        "'next_date' (YYYY-MM-DD), 'consensus', 'actual', 'signal' (BEAT/MISS), and a detailed 'note' explaining the driver. "
        "For central bank rates, include: 'bank', 'rate', 'last_decision_date', 'last_decision' (Hold/Cut/Hike), "
        "'next_date', and detailed 'guidance'. "
        "Also provide a 'g7_rates_summary' list with 'country', 'rate', and 'bank'."
    )
    result = await _call_sub_agent(state, "Calendar", instruction)
    return {"calendar_data": result["data"], "raw_responses": [result["raw"]]}


async def risk_agent(state: AgentState) -> Dict[str, Any]:
    instruction = (
        "Analyze market risk sentiment. Return a JSON with: "
        "'score' (FLOAT 0.0-10.0), 'label' (e.g. Elevated / Geopolitical Stress), 'summary' (detailed), "
        "'gold_technical' (detailed price levels/resistance), 'usd_technical' (DXY levels/drivers), "
        "'safe_haven_analysis' (Treasury/Gold flows), 'contagion_analysis' (Credit/Sector spread), "
        "'oil_contagion' (Crude price impact), and 'macro_context' (broad economic vector). "
        "ALSO include a 'crypto_contagion' object with: 'summary', 'market_cap', 'btc_equity_correlation', "
        "'btc_gold_correlation', and an 'assets' list of objects for BTC, ETH, SOL containing "
        "'name', 'price', 'change_24h', 'change_7d', 'contagion_signal' (MODERATE/LOW/HIGH), and 'note'."
    )
    result = await _call_sub_agent(state, "Risk", instruction)
    return {"risk_data": result["data"], "raw_responses": [result["raw"]]}


async def credit_agent(state: AgentState) -> Dict[str, Any]:
    instruction = (
        "Analyze Credit Health. Return a JSON with: "
        "'mid_cap_avg_icr' (FLOAT), 'icr_alert' (BOOL), 'icr_alert_note' (detailed), "
        "'sectoral_breakdown' (list of objects with 'sector', 'average_icr' (FLOAT), 'status', 'note'), "
        "'pik_debt_issuance' (string), 'pik_debt_note' (detailed), "
        "'cre_delinquency_rate' (string), 'cre_delinquency_trend' (UP/DOWN/STABLE), "
        "'mid_cap_hy_oas' (string), 'mid_cap_hy_oas_note' (detailed), "
        "'cp_spreads' (string), 'cp_spreads_note' (detailed), "
        "'vix_of_credit_cdx' (string), 'vix_of_credit_note' (detailed), 'alert' (BOOL), "
        "and a 'watchlist' (list of objects with 'firm_name', 'ticker', 'sector', 'debt_load', "
        "'icr' (FLOAT), 'insider_selling', 'cds_pricing', 'pik_usage' (BOOL), and 'note')."
    )
    result = await _call_sub_agent(state, "Credit", instruction)
    return {"credit_data": result["data"], "raw_responses": [result["raw"]]}


async def strategy_agent(state: AgentState) -> Dict[str, Any]:
    instruction = (
        "Analyze macro-economic strategy. Return a JSON with: "
        "'events' (list of objects with 'title', 'category' (GEOPOLITICAL/ECONOMIC_DATA/LEGAL/CREDIT/TRADE/RATE_DECISION), "
        "'severity' (CRITICAL/HIGH/MEDIUM/LOW), 'description' (detailed), 'potential_impact' (detailed)), "
        "'portfolio_suggestions' (list of objects with 'asset_class', 'percentage' (e.g. 30%), 'rationale' (detailed)), "
        "and 'risk_mitigation_steps' (list of detailed strings)."
    )
    result = await _call_sub_agent(state, "Strategy", instruction)
    return {"strategy_data": result["data"], "raw_responses": [result["raw"]]}


async def _run_parallel_sections(state: AgentState) -> tuple[Dict[str, Any], Dict[str, bool], list[str], set[str]]:
    sections = [
        ("calendar", calendar_agent),
        ("risk", risk_agent),
        ("credit", credit_agent),
        ("strategy", strategy_agent),
    ]

    results = await asyncio.gather(*(fn(state) for _, fn in sections), return_exceptions=True)

    updates: Dict[str, Any] = {}
    status: Dict[str, bool] = {}
    raw_responses: list[str] = []
    failed_sections: set[str] = set()

    for (name, _), result in zip(sections, results):
        data_key = f"{name}_data"
        if isinstance(result, Exception):
            error_text = f"Error in {name.capitalize()} after orchestration failure: {result}"
            logger.error(error_text)
            updates[data_key] = None
            raw_responses.append(error_text)
            status[name] = False
            failed_sections.add(name)
            continue

        updates[data_key] = result.get(data_key)
        raw_responses.extend(result.get("raw_responses", []))
        section_ok = result.get(data_key) is not None
        status[name] = section_ok
        if not section_ok:
            failed_sections.add(name)

    return updates, status, raw_responses, failed_sections


def aggregator_node(state: AgentState) -> Dict[str, Any]:
    logger.info("Aggregator: Constructing final dashboard report...")

    missing_sections = []
    calendar_data = state.get("calendar_data")
    risk_data = state.get("risk_data")
    credit_data = state.get("credit_data")
    strategy_data = state.get("strategy_data")

    if not calendar_data:
        missing_sections.append("calendar")
        calendar_data = {"dates": [], "rates": [], "g7_rates_summary": []}

    if not risk_data:
        missing_sections.append("risk")
        risk_data = {
            "score": 5,
            "summary": "No data - API failed",
            "contagion_analysis": "N/A",
        }

    if not credit_data:
        missing_sections.append("credit")
        credit_data = {
            "mid_cap_avg_icr": 0,
            "sectoral_breakdown": [],
            "pik_debt_issuance": "N/A",
            "cre_delinquency_rate": "N/A",
            "mid_cap_hy_oas": "N/A",
            "cp_spreads": "N/A",
            "vix_of_credit_cdx": "N/A",
            "watchlist": [],
            "alert": False,
        }

    if not strategy_data:
        missing_sections.append("strategy")
        strategy_data = {"events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []}

    if missing_sections:
        logger.warning("Aggregator: Missing data from sections: %s", ", ".join(missing_sections))

    crypto_contagion = None
    if isinstance(risk_data, dict):
        crypto_contagion = risk_data.get("crypto_contagion")

    combined = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "calendar": calendar_data,
        "risk": risk_data,
        "crypto_contagion": crypto_contagion,
        "credit": credit_data,
        "events": strategy_data.get("events", []),
        "portfolio_suggestions": strategy_data.get("portfolio_suggestions", []),
        "risk_mitigation_steps": strategy_data.get("risk_mitigation_steps", []),
    }
    dashboard = MacroDashboardResponse.model_validate(combined)
    return {"dashboard_data": dashboard}


def _build_initial_state(provider_name: str) -> AgentState:
    return {
        "provider_name": provider_name,
        "is_cloud_provider": _is_cloud(provider_name),
        "aggregated_research": "",
        "raw_responses": [],
        "calendar_data": None,
        "risk_data": None,
        "credit_data": None,
        "strategy_data": None,
        "dashboard_data": None,
    }


async def stream_macro_dashboard(provider_name: str, skip_cache: bool = False) -> AsyncGenerator[str, None]:
    provider_name = normalize_provider_name(provider_name)
    if not skip_cache:
        cached = _load_daily_cache(provider_name)
        if cached:
            yield json.dumps({"status": "research_start", "message": "Loading from daily cache..."})
            yield json.dumps({"status": "analysis_complete", "data": cached["dashboard_data"]})
            return

    state = _build_initial_state(provider_name)
    yield json.dumps({"status": "research_start", "message": f"Orchestrating agents for {provider_name}..."})

    state.update(await researcher_node(state))
    message = "Using internal cloud knowledge." if state["is_cloud_provider"] else "Web research complete."
    yield json.dumps({"status": "routing", "message": message})

    updates, section_status, raw_responses, failed_sections = await _run_parallel_sections(state)
    state.update(updates)
    state["raw_responses"].extend(raw_responses)

    for section_name in _SECTION_NAMES:
        status_msg = (
            f"Completed {section_name} analysis."
            if section_status.get(section_name, False)
            else f"{section_name.capitalize()} analysis failed."
        )
        yield json.dumps({"status": "analysis_progress", "message": status_msg})

    dashboard_model = aggregator_node(state)["dashboard_data"]
    raw_joined = "\n---\n".join(state.get("raw_responses", []))

    if len(failed_sections) == len(_SECTION_NAMES):
        fallback_json = _load_fallback_dashboard()
        if fallback_json is not None:
            logger.info("Aggregator: All sub-agents failed. Using high-fidelity fallback_dashboard.json")
            yield json.dumps(
                {
                    "status": "analysis_complete",
                    "data": fallback_json,
                    "message": "Using high-fidelity fallback due to API errors.",
                }
            )
            return

        yield json.dumps(
            {
                "status": "error",
                "message": "All provider sections failed and no fallback available.",
                "raw_response": raw_joined,
            }
        )
        return

    dashboard_json = dashboard_model.model_dump()
    _save_cache(provider_name, dashboard_json, raw_joined)
    yield json.dumps({"status": "analysis_complete", "data": dashboard_json, "raw_response": raw_joined})


async def generate_macro_dashboard_async(provider_name: str, skip_cache: bool = False) -> MacroDashboardResponse:
    provider_name = normalize_provider_name(provider_name)
    if not skip_cache:
        cached = _load_daily_cache(provider_name)
        if cached:
            return MacroDashboardResponse.model_validate(cached["dashboard_data"])

    state = _build_initial_state(provider_name)
    state.update(await researcher_node(state))

    updates, _, raw_responses, failed_sections = await _run_parallel_sections(state)
    state.update(updates)
    state["raw_responses"].extend(raw_responses)

    if len(failed_sections) == len(_SECTION_NAMES):
        fallback_json = _load_fallback_dashboard()
        if fallback_json is not None:
            return MacroDashboardResponse.model_validate(fallback_json)

    dashboard_model = aggregator_node(state)["dashboard_data"]
    _save_cache(provider_name, dashboard_model.model_dump(), "\n---\n".join(state.get("raw_responses", [])))
    return dashboard_model


def generate_macro_dashboard(provider_name: str, skip_cache: bool = False) -> MacroDashboardResponse:
    return asyncio.run(generate_macro_dashboard_async(provider_name, skip_cache=skip_cache))


def _load_latest_dashboard() -> dict | None:
    if not _LATEST_CACHE_PATH.exists():
        return None
    try:
        return json.loads(_LATEST_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None
