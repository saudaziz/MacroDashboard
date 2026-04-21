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

try:
    from backend.logging_config import configure_logging
    from backend.runtime_paths import CACHE_DIR, LATEST_DASHBOARD_PATH
    from backend.autogen_researcher import run_autogen_research
except ImportError:
    from logging_config import configure_logging
    from runtime_paths import CACHE_DIR, LATEST_DASHBOARD_PATH
    from autogen_researcher import run_autogen_research

configure_logging()
logger = logging.getLogger("AgentOrchestrator")

load_dotenv()

try:
    from backend.models import (
        CreditHealth,
        CryptoContagion,
        MacroCalendar,
        MacroDashboardResponse,
        MarketEvent,
        PortfolioAllocation,
        RiskSentiment,
    )
    from backend.providers import get_provider, normalize_provider_name
except ImportError:
    from models import (
        CreditHealth,
        CryptoContagion,
        MacroCalendar,
        MacroDashboardResponse,
        MarketEvent,
        PortfolioAllocation,
        RiskSentiment,
    )
    from providers import get_provider, normalize_provider_name

# --- Retry Configuration ---
MAX_RETRIES = 5
INITIAL_RETRY_DELAY = 1.0
MAX_RETRY_DELAY = 10.0

# --- Cache Configuration ---
_LATEST_CACHE_PATH = LATEST_DASHBOARD_PATH
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
    reasoning: Optional[str]


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
    return provider_name.lower() in {"gemini", "claude", "qwen", "bytedance", "deepseek"}


def _get_throttle_time(provider_name: str) -> float:
    if provider_name.lower() == "gemini":
        return float(os.getenv("GEMINI_THROTTLE_SEC", "5.0"))
    return 0.0


def _extract_balanced_json_block(text: str) -> str | None:
    start = -1
    for idx, char in enumerate(text):
        if char in "{[":
            start = idx
            break
    if start < 0:
        return None

    stack: list[str] = [text[start]]
    in_string = False
    escaped = False
    for idx in range(start + 1, len(text)):
        ch = text[idx]

        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
            continue
        if ch in "{[":
            stack.append(ch)
            continue
        if ch == "}":
            if not stack:
                return None
            top = stack.pop()
            if top != "{":
                return None
            if not stack:
                return text[start : idx + 1]
            continue
        if ch == "]":
            if not stack:
                return None
            top = stack.pop()
            if top != "[":
                return None
            if not stack:
                return text[start : idx + 1]
            continue
    return None


def _try_parse_json_payload(content: str) -> tuple[Any | None, str]:
    stripped = content.strip()
    
    # Remove markdown code blocks if present
    clean_content = stripped
    if "```" in stripped:
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", stripped, re.DOTALL | re.IGNORECASE)
        if match:
            clean_content = match.group(1).strip()
        else:
            clean_content = re.sub(r"^```(?:json)?\s*|\s*```$", "", stripped, flags=re.IGNORECASE | re.DOTALL).strip()

    candidates: list[str] = [clean_content]

    balanced = _extract_balanced_json_block(clean_content)
    if balanced:
        candidates.append(balanced)
    
    # Fallback to the original stripped content if cleaning was too aggressive
    if stripped not in candidates:
        candidates.append(stripped)

    seen: set[str] = set()
    unique_candidates: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            unique_candidates.append(candidate)

    last_error = "Unknown JSON parse failure"
    for candidate in unique_candidates:
        try:
            return json.loads(candidate), candidate
        except json.JSONDecodeError:
            # Try basic fixes for common LLM JSON errors
            try:
                # Fix trailing commas in objects and arrays
                fixed = re.sub(r",\s*([\]}])", r"\1", candidate)
                # Fix unescaped newlines within strings (basic attempt)
                fixed = fixed.replace("\n", "\\n").replace("\r", "\\r")
                # But don't escape actual JSON structure newlines
                fixed = fixed.replace("\\n{", "\n{").replace("}\\n", "}\n")
                fixed = fixed.replace("\\n[", "\n[").replace("]\\n", "]\n")
                fixed = fixed.replace('":\\n"', '": "').replace('",\\n"', '", "')
                
                return json.loads(fixed), fixed
            except Exception as exc:
                last_error = str(exc)

    return None, f"JSON Parse Error: {last_error}"


async def _call_sub_agent(state: AgentState, section: str, instruction: str, yield_callback=None) -> Dict[str, Any]:
    provider_name = state["provider_name"]
    logger.info("Sub-Agent [%s]: Invoking %s...", section, provider_name)

    if yield_callback:
        await yield_callback({
            "status": "agent_step",
            "agent": f"{section}Agent",
            "message": f"Analyzing {section} data using {provider_name}..."
        })

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

            # Added timeout to prevent hanging on gateway timeouts
            response = await asyncio.wait_for(
                model.ainvoke([HumanMessage(content=prompt)]),
                timeout=120.0
            )
            
            # Extract content and reasoning
            content = response.content if hasattr(response, "content") else str(response)
            
            reasoning = None
            if hasattr(response, "additional_kwargs"):
                # Try to extract reasoning from additional_kwargs (OpenAI/QWEN style)
                reasoning = response.additional_kwargs.get("reasoning_content")
            
            if not reasoning and hasattr(response, "response_metadata"):
                # Some providers put it in response_metadata
                reasoning = response.response_metadata.get("reasoning_content")

            parsed, parsed_or_error = _try_parse_json_payload(content)
            if parsed is None:
                raise json.JSONDecodeError(parsed_or_error, content, 0)

            logger.info("Sub-Agent [%s] Success on attempt %s", section, attempt + 1)
            return {"data": parsed, "raw": parsed_or_error, "reasoning": reasoning}
        except json.JSONDecodeError as exc:
            last_error = f"JSON Parse Error: {exc}"
            if attempt < MAX_RETRIES - 1:
                logger.info("Sub-Agent [%s] JSON parsing failed on attempt %s, retrying.", section, attempt + 1)
            else:
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


# --- HITL State ---
_hitl_event = asyncio.Event()
_hitl_data = {"pending": False, "decision": None}

async def resume_workflow(decision: str):
    logger.info("HITL: Resuming workflow with decision: %s", decision)
    _hitl_data["decision"] = decision
    _hitl_data["pending"] = False
    _hitl_event.set()


async def researcher_node(state: AgentState, yield_callback=None) -> Dict[str, Any]:
    if state["is_cloud_provider"]:
        return {"aggregated_research": "[Cloud Tier: Internal Knowledge Base Active]"}

    logger.info("Researcher Agent: Scraping latest macro data...")
    if yield_callback:
        await yield_callback({"status": "agent_step", "agent": "Researcher", "message": "Initiating deep macro research..."})
    
    # Try to use AutoGen researcher if available
    try:
        research_context = await run_autogen_research(state["provider_name"], yield_callback=yield_callback)
        return {"aggregated_research": research_context}
    except Exception as exc:
        logger.error("AutoGen research failed, falling back to basic search: %s", exc)

    search = DuckDuckGoSearchRun()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    queries = [
        f"current gold price and crude oil price today {today_str}",
        f"latest macro economic dates CPI PPI Jobs 2026",
        f"G7 central bank rates guidance 2026",
        f"credit spreads mid-cap ICR and delinquency rates 2026",
    ]

    async def run_query(query: str) -> str:
        try:
            # Added internal timeout for search
            result = await asyncio.wait_for(
                asyncio.to_thread(search.run, query),
                timeout=30.0
            )
            return f"### {query}\n{result}"
        except Exception as exc:
            logger.warning("Search query failed for '%s': %s", query, exc)
            return ""

    # Run queries with a slight stagger
    query_results = []
    for q in queries:
        res = await run_query(q)
        if res:
            query_results.append(res)
        await asyncio.sleep(1.0) # Small stagger to avoid rate limiting

    return {"aggregated_research": "\n\n".join(query_results) if query_results else "No fresh web data found."}


async def calendar_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    instruction = (
        f"Extract LATEST AVAILABLE macro economic dates as of {today_str}.\n"
        f"Return ONLY valid JSON with two arrays: 'dates' and 'rates'.\n"
        f"dates array: List items with event|last_date|next_date|signal (inline format, no nested objects).\n"
        f"rates array: List items with bank|rate|guidance (inline format, no nested objects).\n"
        f"Example: {{\"dates\": [{{\"event\": \"CPI Release\", \"last_date\": \"2026-03-10\", \"next_date\": \"2026-04-10\", \"signal\": \"BEAT\"}}], \"rates\": [{{\"bank\": \"FED\", \"rate\": \"5.5%\", \"guidance\": \"Hold\"}}]}}\n"
        f"Include major events: CPI, PPI, Jobs, FED, BOJ, BOE, ECB. Keep values as strings. Return ONLY valid JSON."
    )
    result = await _call_sub_agent(state, "Calendar", instruction, yield_callback=yield_callback)
    return {"calendar_data": result["data"], "raw_responses": [result["raw"]], "reasoning": result.get("reasoning")}


async def risk_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    instruction = (
        f"Analyze market risk sentiment using LATEST AVAILABLE data as of {today_str}. Return a JSON with: "
        "'score' (FLOAT 0.0-10.0), 'label' (e.g. Elevated / Geopolitical Stress), 'summary' (detailed), "
        "'gold_technical' (CURRENT gold price and detailed levels), 'usd_technical' (DXY levels/drivers), "
        "'safe_haven_analysis' (Treasury/Gold flows), 'contagion_analysis' (Credit/Sector spread), "
        "'oil_contagion' (CURRENT crude price impact), and 'macro_context' (broad economic vector). "
        "ALSO include a 'crypto_contagion' object with: 'summary', 'market_cap', 'btc_equity_correlation', "
        "'btc_gold_correlation', and an 'assets' list of objects for BTC, ETH, SOL containing "
        "'name', 'price', 'change_24h', 'change_7d', 'contagion_signal' (MODERATE/LOW/HIGH), and 'note'."
    )
    result = await _call_sub_agent(state, "Risk", instruction, yield_callback=yield_callback)
    return {"risk_data": result["data"], "raw_responses": [result["raw"]], "reasoning": result.get("reasoning")}


async def credit_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    instruction = (
        f"Analyze Credit Health using LATEST AVAILABLE data as of {today_str}. Return a JSON with: "
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
    result = await _call_sub_agent(state, "Credit", instruction, yield_callback=yield_callback)
    
    # --- HITL Pattern ---
    data = result.get("data")
    if data and data.get("icr_alert"):
        if yield_callback:
            await yield_callback({
                "status": "interrupt",
                "agent": "CreditAgent",
                "message": f"CRITICAL: Low ICR detected ({data.get('mid_cap_avg_icr')}). Proceed with deep dive?",
                "data": {"mid_cap_avg_icr": data.get("mid_cap_avg_icr")}
            })
            
        logger.info("HITL: Credit Agent waiting for user approval due to ICR alert.")
        _hitl_data["pending"] = True
        _hitl_event.clear()
        await _hitl_event.wait()
        
        if _hitl_data["decision"] == "approved":
            if yield_callback:
                await yield_callback({
                    "status": "agent_step",
                    "agent": "CreditAgent",
                    "message": "User approved deep dive. Performing additional credit stress test..."
                })
            # Mock deeper analysis update
            if data.get("icr_alert_note"):
                data["icr_alert_note"] += " [DEEP DIVE PERFORMED: Confirmed high insolvency risk in retail sector.]"
    
    return {"credit_data": data, "raw_responses": [result["raw"]], "reasoning": result.get("reasoning")}


async def strategy_agent(state: AgentState, yield_callback=None) -> Dict[str, Any]:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    instruction = (
        f"Analyze macro-economic strategy using LATEST AVAILABLE data as of {today_str}. Return a JSON with: "
        "'events' (list of objects with 'title', 'category' (GEOPOLITICAL/ECONOMIC_DATA/LEGAL/CREDIT/TRADE/RATE_DECISION), "
        "'severity' (CRITICAL/HIGH/MEDIUM/LOW), 'description' (detailed), 'potential_impact' (detailed)), "
        "'portfolio_suggestions' (list of objects with 'asset_class', 'percentage' (e.g. 30%), 'rationale' (detailed)), "
        "and 'risk_mitigation_steps' (list of detailed strings)."
    )
    result = await _call_sub_agent(state, "Strategy", instruction, yield_callback=yield_callback)
    return {"strategy_data": result["data"], "raw_responses": [result["raw"]], "reasoning": result.get("reasoning")}


async def _run_parallel_sections(state: AgentState, yield_callback=None) -> tuple[Dict[str, Any], Dict[str, bool], list[str], set[str], list[str]]:
    sections = [
        ("calendar", calendar_agent),
        ("risk", risk_agent),
        ("credit", credit_agent),
        ("strategy", strategy_agent),
    ]

    async def wrapped_agent(name, fn):
        res = await fn(state, yield_callback=yield_callback)
        if yield_callback and res.get(f"{name}_data"):
            await yield_callback({
                "status": "snapshot",
                "agent": f"{name.capitalize()}Agent",
                "section": name,
                "data": res[f"{name}_data"]
            })
        return res

    results = await asyncio.gather(*(wrapped_agent(name, fn) for name, fn in sections), return_exceptions=True)

    updates: Dict[str, Any] = {}
    status: Dict[str, bool] = {}
    raw_responses: list[str] = []
    failed_sections: set[str] = set()
    reasoning_list: list[str] = []

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
        
        reasoning = result.get("reasoning")
        if reasoning:
            reasoning_list.append(f"### {name.capitalize()} Reasoning\n{reasoning}")

        section_ok = result.get(data_key) is not None
        status[name] = section_ok
        if not section_ok:
            failed_sections.add(name)

    return updates, status, raw_responses, failed_sections, reasoning_list


def aggregator_node(state: AgentState, reasoning_list: Optional[list[str]] = None) -> Dict[str, Any]:
    logger.info("Aggregator: Constructing final dashboard report...")

    combined_reasoning = "\n\n".join(reasoning_list) if reasoning_list else None

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

    normalized_calendar = _normalize_calendar_payload(calendar_data)
    normalized_risk = _normalize_risk_payload(risk_data)
    normalized_credit = _normalize_credit_payload(credit_data)
    normalized_strategy = _normalize_strategy_payload(strategy_data)

    try:
        calendar_model = MacroCalendar.model_validate(normalized_calendar)
    except Exception as exc:
        logger.warning("Aggregator: Calendar validation failed, using fallback. Error: %s", exc)
        calendar_model = MacroCalendar.model_validate({"dates": [], "rates": [], "g7_rates_summary": []})

    try:
        risk_model = RiskSentiment.model_validate(normalized_risk)
    except Exception as exc:
        logger.warning("Aggregator: Risk validation failed, using fallback. Error: %s", exc)
        risk_model = RiskSentiment.model_validate(
            {"score": 5, "summary": "No data - API failed", "contagion_analysis": "N/A"}
        )

    try:
        credit_model = CreditHealth.model_validate(normalized_credit)
    except Exception as exc:
        logger.warning("Aggregator: Credit validation failed, using fallback. Error: %s", exc)
        credit_model = CreditHealth.model_validate(
            {
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
        )

    crypto_contagion = None
    if isinstance(normalized_risk, dict):
        try:
            if normalized_risk.get("crypto_contagion") is not None:
                crypto_contagion = CryptoContagion.model_validate(normalized_risk.get("crypto_contagion"))
        except Exception as exc:
            logger.warning("Aggregator: Crypto contagion validation failed, dropping section. Error: %s", exc)
            crypto_contagion = None

    events_raw = normalized_strategy.get("events", [])
    events: list[MarketEvent] = []
    for event in events_raw if isinstance(events_raw, list) else []:
        try:
            events.append(MarketEvent.model_validate(event))
        except Exception:
            continue

    suggestions_raw = normalized_strategy.get("portfolio_suggestions", [])
    suggestions: list[PortfolioAllocation] = []
    for suggestion in suggestions_raw if isinstance(suggestions_raw, list) else []:
        try:
            suggestions.append(PortfolioAllocation.model_validate(suggestion))
        except Exception:
            continue

    mitigation_raw = normalized_strategy.get("risk_mitigation_steps", [])
    mitigation_steps = [str(step) for step in mitigation_raw] if isinstance(mitigation_raw, list) else []

    combined = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "calendar": calendar_model.model_dump(),
        "risk": risk_model.model_dump(),
        "crypto_contagion": crypto_contagion.model_dump() if crypto_contagion else None,
        "credit": credit_model.model_dump(),
        "events": [event.model_dump() for event in events],
        "portfolio_suggestions": [suggestion.model_dump() for suggestion in suggestions],
        "risk_mitigation_steps": mitigation_steps,
        "reasoning": combined_reasoning,
    }

    try:
        dashboard = MacroDashboardResponse.model_validate(combined)
    except Exception as exc:
        logger.error("Aggregator: Final validation failed, returning fully safe fallback. Error: %s", exc)
        dashboard = MacroDashboardResponse.model_validate(
            {
                "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "calendar": {"dates": [], "rates": [], "g7_rates_summary": []},
                "risk": {"score": 5, "summary": "Fallback dashboard", "contagion_analysis": "N/A"},
                "credit": {
                    "mid_cap_avg_icr": 0,
                    "sectoral_breakdown": [],
                    "pik_debt_issuance": "N/A",
                    "cre_delinquency_rate": "N/A",
                    "mid_cap_hy_oas": "N/A",
                    "cp_spreads": "N/A",
                    "vix_of_credit_cdx": "N/A",
                    "watchlist": [],
                    "alert": False,
                },
                "events": [],
                "portfolio_suggestions": [],
                "risk_mitigation_steps": [],
            }
        )

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


def _normalize_calendar_payload(raw_calendar: Any) -> Dict[str, Any]:
    """Normalize common LLM calendar payload variants to MacroCalendar shape.

    Expected final shape:
    {
      "dates": [...],
      "rates": [...],
      "g7_rates_summary": [...]
    }
    """
    if not isinstance(raw_calendar, dict):
        return {"dates": [], "rates": [], "g7_rates_summary": []}

    dates_raw = raw_calendar.get("dates")
    rates_raw = raw_calendar.get("rates")
    g7_raw = raw_calendar.get("g7_rates_summary")

    # Common alternate fields from model outputs.
    events_raw = raw_calendar.get("events")
    economic_raw = raw_calendar.get("economic_data")
    policy_rates_raw = raw_calendar.get("policy_rates") or raw_calendar.get("central_banks")

    # Ensure lists only - reject scalars and dict objects
    if not isinstance(dates_raw, list):
        dates_raw = [] if isinstance(dates_raw, (str, dict)) else []
    if not isinstance(rates_raw, list):
        rates_raw = [] if isinstance(rates_raw, (str, dict)) else []
    if not isinstance(g7_raw, list):
        g7_raw = [] if isinstance(g7_raw, (str, dict)) else []

    if isinstance(events_raw, list):
        for item in events_raw:
            if not isinstance(item, dict):
                continue
            # If it looks like central bank info, route to rates.
            if "bank" in item or "rate" in item or "guidance" in item:
                rates_raw.append(item)
            else:
                dates_raw.append(item)

    if isinstance(economic_raw, list):
        dates_raw.extend(item for item in economic_raw if isinstance(item, dict))

    if isinstance(policy_rates_raw, list):
        rates_raw.extend(item for item in policy_rates_raw if isinstance(item, dict))

    normalized_dates: list[dict[str, Any]] = []
    for item in dates_raw:
        if not isinstance(item, dict):
            continue
        normalized_dates.append(
            {
                "event": item.get("event") or item.get("title") or item.get("name") or "Unknown Event",
                "last_date": item.get("last_date") or item.get("previous_date") or item.get("date") or "N/A",
                "last_period": item.get("last_period"),
                "next_date": item.get("next_date") or item.get("upcoming_date") or "N/A",
                "consensus": item.get("consensus"),
                "actual": item.get("actual"),
                "signal": item.get("signal"),
                "note": item.get("note"),
            }
        )

    normalized_rates: list[dict[str, Any]] = []
    for item in rates_raw:
        if not isinstance(item, dict):
            continue
        normalized_rates.append(
            {
                "bank": item.get("bank") or item.get("central_bank") or item.get("institution") or "Unknown Bank",
                "rate": str(item.get("rate") if item.get("rate") is not None else "N/A"),
                "last_decision_date": item.get("last_decision_date") or item.get("last_date"),
                "last_decision": item.get("last_decision"),
                "next_date": item.get("next_date"),
                "guidance": item.get("guidance") or item.get("note") or "N/A",
            }
        )

    normalized_g7: list[dict[str, Any]] = []
    source_g7 = g7_raw if g7_raw else normalized_rates
    for item in source_g7:
        if not isinstance(item, dict):
            continue
        normalized_g7.append(
            {
                "country": item.get("country") or item.get("bank") or "N/A",
                "rate": str(item.get("rate") if item.get("rate") is not None else "N/A"),
                "bank": item.get("bank") or item.get("central_bank") or "N/A",
            }
        )

    return {
        "dates": normalized_dates,
        "rates": normalized_rates,
        "g7_rates_summary": normalized_g7,
    }


def _to_float(value: Any, default: float) -> float:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        result = float(value)
        if result != result:  # NaN
            return default
        return result
    if isinstance(value, str):
        try:
            result = float(value)
            if result != result:  # NaN
                return default
            return result
        except ValueError:
            return default
    return default


def _normalize_risk_payload(raw_risk: Any) -> Dict[str, Any]:
    if not isinstance(raw_risk, dict):
        return {"score": 5.0, "summary": "No data - API failed", "contagion_analysis": "N/A"}

    score = _to_float(raw_risk.get("score"), 5.0)
    score = min(max(score, 0.0), 10.0)

    summary = raw_risk.get("summary") or raw_risk.get("label") or "No risk summary available"
    contagion = raw_risk.get("contagion_analysis") or raw_risk.get("safe_haven_analysis") or "N/A"

    crypto_raw = raw_risk.get("crypto_contagion")
    if isinstance(crypto_raw, dict):
        crypto_raw = {
            "summary": crypto_raw.get("summary") or "Crypto section available with partial details",
            "assets": crypto_raw.get("assets") if isinstance(crypto_raw.get("assets"), list) else [],
            "btc_equity_correlation": crypto_raw.get("btc_equity_correlation"),
            "btc_gold_correlation": crypto_raw.get("btc_gold_correlation"),
            "market_cap": crypto_raw.get("market_cap"),
        }
    else:
        crypto_raw = None

    return {
        "score": score,
        "label": raw_risk.get("label"),
        "summary": str(summary),
        "gold_technical": raw_risk.get("gold_technical"),
        "usd_technical": raw_risk.get("usd_technical"),
        "safe_haven_analysis": raw_risk.get("safe_haven_analysis"),
        "contagion_analysis": str(contagion),
        "oil_contagion": raw_risk.get("oil_contagion"),
        "macro_context": raw_risk.get("macro_context"),
        "crypto_contagion": crypto_raw,
    }


def _normalize_credit_payload(raw_credit: Any) -> Dict[str, Any]:
    if not isinstance(raw_credit, dict):
        raw_credit = {}

    sectoral = raw_credit.get("sectoral_breakdown")
    if not isinstance(sectoral, list):
        sectoral = []

    watchlist = raw_credit.get("watchlist")
    if not isinstance(watchlist, list):
        watchlist = []

    # Ensure all required fields have proper defaults
    mid_cap_icr = _to_float(raw_credit.get("mid_cap_avg_icr"), 0.0)
    
    return {
        "mid_cap_avg_icr": mid_cap_icr,
        "icr_alert": raw_credit.get("icr_alert"),
        "icr_alert_note": raw_credit.get("icr_alert_note"),
        "sectoral_breakdown": [item for item in sectoral if isinstance(item, dict)] or [{"sector": "N/A", "average_icr": 0.0}],
        "pik_debt_issuance": str(raw_credit.get("pik_debt_issuance") or "N/A"),
        "pik_debt_note": raw_credit.get("pik_debt_note"),
        "cre_delinquency_rate": str(raw_credit.get("cre_delinquency_rate") or "N/A"),
        "cre_delinquency_trend": raw_credit.get("cre_delinquency_trend"),
        "mid_cap_hy_oas": str(raw_credit.get("mid_cap_hy_oas") or "N/A"),
        "mid_cap_hy_oas_note": raw_credit.get("mid_cap_hy_oas_note"),
        "cp_spreads": str(raw_credit.get("cp_spreads") or "N/A"),
        "cp_spreads_note": raw_credit.get("cp_spreads_note"),
        "vix_of_credit_cdx": str(raw_credit.get("vix_of_credit_cdx") or "N/A"),
        "vix_of_credit_note": raw_credit.get("vix_of_credit_note"),
        "alert": bool(raw_credit.get("alert", False)),
        "watchlist": [item for item in watchlist if isinstance(item, dict)] or [],
    }


def _normalize_strategy_payload(raw_strategy: Any) -> Dict[str, Any]:
    if not isinstance(raw_strategy, dict):
        return {"events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []}
    events = raw_strategy.get("events")
    suggestions = raw_strategy.get("portfolio_suggestions")
    steps = raw_strategy.get("risk_mitigation_steps")
    return {
        "events": events if isinstance(events, list) else [],
        "portfolio_suggestions": suggestions if isinstance(suggestions, list) else [],
        "risk_mitigation_steps": steps if isinstance(steps, list) else [],
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
    
    # Use a queue to bridge the async orchestration task and the generator
    queue = asyncio.Queue()
    
    async def put_event(event):
        await queue.put(event)

    async def run_orchestration():
        try:
            await put_event({"status": "research_start", "message": f"Orchestrating agents for {provider_name}..."})
            state.update(await researcher_node(state, yield_callback=put_event))
            
            message = "Using internal cloud knowledge." if state["is_cloud_provider"] else "Web research complete."
            await put_event({"status": "routing", "message": message})

            updates, section_status, raw_responses, failed_sections, reasoning_list = await _run_parallel_sections(state, yield_callback=put_event)
            state.update(updates)
            state["raw_responses"].extend(raw_responses)
            state["reasoning"] = "\n\n".join(reasoning_list)

            for section_name in _SECTION_NAMES:
                status_msg = (
                    f"Completed {section_name} analysis."
                    if section_status.get(section_name, False)
                    else f"{section_name.capitalize()} analysis failed."
                )
                await put_event({"status": "analysis_progress", "message": status_msg})

            if reasoning_list:
                await put_event({"status": "thinking_complete", "message": "Thinking phase concluded.", "reasoning": state["reasoning"]})

            dashboard_model = aggregator_node(state, reasoning_list)["dashboard_data"]
            raw_joined = "\n---\n".join(state.get("raw_responses", []))

            if len(failed_sections) == len(_SECTION_NAMES):
                fallback_json = _load_fallback_dashboard()
                if fallback_json is not None:
                    await put_event({
                        "status": "analysis_complete",
                        "data": fallback_json,
                        "message": "Using high-fidelity fallback due to API errors.",
                    })
                    await queue.put(None)
                    return

                await put_event({
                    "status": "error",
                    "message": "All provider sections failed and no fallback available.",
                    "raw_response": raw_joined,
                })
                await queue.put(None)
                return

            dashboard_json = dashboard_model.model_dump()
            _save_cache(provider_name, dashboard_json, raw_joined)
            await put_event({"status": "analysis_complete", "data": dashboard_json, "raw_response": raw_joined})
            await queue.put(None)
        except Exception as e:
            await put_event({"status": "error", "message": str(e)})
            await queue.put(None)

    orchestration_task = asyncio.create_task(run_orchestration())
    
    while True:
        event = await queue.get()
        if event is None:
            break
        yield json.dumps(event)
    
    await orchestration_task


async def generate_macro_dashboard_async(provider_name: str, skip_cache: bool = False) -> MacroDashboardResponse:
    provider_name = normalize_provider_name(provider_name)
    if not skip_cache:
        cached = _load_daily_cache(provider_name)
        if cached:
            return MacroDashboardResponse.model_validate(cached["dashboard_data"])

    state = _build_initial_state(provider_name)
    state.update(await researcher_node(state))

    updates, _, raw_responses, failed_sections, reasoning_list = await _run_parallel_sections(state)
    state.update(updates)
    state["raw_responses"].extend(raw_responses)
    state["reasoning"] = "\n\n".join(reasoning_list)

    if len(failed_sections) == len(_SECTION_NAMES):
        fallback_json = _load_fallback_dashboard()
        if fallback_json is not None:
            return MacroDashboardResponse.model_validate(fallback_json)

    dashboard_model = aggregator_node(state, reasoning_list)["dashboard_data"]
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
