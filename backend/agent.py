import json
import re
import time
import asyncio
import operator
import os
import logging
from dotenv import load_dotenv
from typing import List, Dict, Any, TypedDict, Annotated, AsyncGenerator, Optional
from pathlib import Path
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AgentOrchestrator")

# Load environment variables
load_dotenv()

from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END

try:
    from backend.models import (
        MacroDashboardResponse, MacroCalendar, RiskSentiment, 
        CreditHealth, MarketEvent, PortfolioAllocation
    )
    from backend.providers import get_provider
except ImportError:
    from models import (
        MacroDashboardResponse, MacroCalendar, RiskSentiment, 
        CreditHealth, MarketEvent, PortfolioAllocation
    )
    from providers import get_provider

# --- Retry Configuration ---
MAX_RETRIES = 3
INITIAL_RETRY_DELAY = 1.0  # seconds
MAX_RETRY_DELAY = 10.0  # seconds

# --- Cache Configuration ---
CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
_LATEST_CACHE_PATH = Path(__file__).resolve().parent / "latest_dashboard.json"

def _load_daily_cache(provider_name: str) -> dict | None:
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    path = CACHE_DIR / f"{provider_name.lower().replace(' ', '_')}_{date_str}.json"
    if not path.exists(): return None
    try:
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("date") == date_str:
            logger.info(f"Daily cache hit for {provider_name} on {date_str}")
            return cached
        else:
            logger.info(f"Daily cache stale for {provider_name}. Cached: {cached.get('date')}, Current: {date_str}")
            return None
    except Exception as exc:
        logger.error(f"Cache load error: {exc}")
    return None

def _save_cache(provider_name: str, dashboard_data: Any, raw_response: str) -> None:
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    path = CACHE_DIR / f"{provider_name.lower().replace(' ', '_')}_{date_str}.json"
    payload = {
        "provider": provider_name, "date": date_str, "timestamp": time.time(),
        "dashboard_data": dashboard_data, "raw_response": raw_response
    }
    try:
        json_data = json.dumps(payload, indent=2)
        path.write_text(json_data, encoding="utf-8")
        _LATEST_CACHE_PATH.write_text(json_data, encoding="utf-8")
    except Exception as exc:
        logger.error(f"Cache save error: {exc}")

# --- State Definition ---

class AgentState(TypedDict):
    provider_name: str
    is_cloud_provider: bool
    aggregated_research: str
    
    # Task Management
    tasks_to_do: List[str]
    current_task: Optional[str]
    
    # Sub-agent Results
    calendar_data: Optional[Dict[str, Any]]
    risk_data: Optional[Dict[str, Any]]
    credit_data: Optional[Dict[str, Any]]
    strategy_data: Optional[Dict[str, Any]]
    
    # Final Output
    dashboard_data: Optional[MacroDashboardResponse]
    raw_responses: Annotated[List[str], operator.add]

# --- Helper Functions ---

def _is_cloud(provider_name: str) -> bool:
    return provider_name.lower() in ["gemini", "claude", "nvidia", "bytedance"]

def _get_throttle_time(provider_name: str) -> float:
    """Returns delay in seconds to avoid 429s on Free tiers."""
    if provider_name.lower() == "gemini":
        return float(os.getenv("GEMINI_THROTTLE_SEC", "5.0"))
    return 0.0

# --- Sub-Agent Worker Logic ---

async def _call_sub_agent(state: AgentState, section: str, instruction: str) -> Dict[str, Any]:
    provider_name = state["provider_name"]
    logger.info(f"Sub-Agent [{section}]: Invoking {provider_name}...")
    
    # Apply throttling for Cloud providers
    if state["is_cloud_provider"]:
        delay = _get_throttle_time(provider_name)
        if delay > 0:
            logger.info(f"Throttling Cloud API: {delay}s delay...")
            await asyncio.sleep(delay)

    prompt = (
        f"You are a specialized Macro Sub-Agent for: {section}.\n"
        f"{instruction}\n"
        f"{'RESEARCH CONTEXT:' + chr(10) + state.get('aggregated_research', '')[:5000] if not state['is_cloud_provider'] else ''}\n\n"
        "Return ONLY valid raw JSON. No markdown, no preamble."
    )
    
    # Retry loop with exponential backoff
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Sub-Agent [{section}] Attempt {attempt + 1}/{MAX_RETRIES}...")
            provider = get_provider(provider_name)
            model = provider.get_model()
            
            response = await model.ainvoke([HumanMessage(content=prompt)])
            content = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON
            json_match = re.search(r"(\{.*\})|(\[.*\])", content, re.DOTALL)
            clean_content = json_match.group(0) if json_match else content
            parsed = json.loads(clean_content)
            
            logger.info(f"Sub-Agent [{section}] Success on attempt {attempt + 1}")
            return {"data": parsed, "raw": clean_content}
            
        except json.JSONDecodeError as e:
            last_error = f"JSON Parse Error: {str(e)}"
            logger.warning(f"Sub-Agent [{section}] JSON parsing failed: {e}")
        except Exception as e:
            last_error = str(e)
            logger.warning(f"Sub-Agent [{section}] Attempt {attempt + 1} failed: {e}")
            
            # Exponential backoff for retries
            if attempt < MAX_RETRIES - 1:
                delay = min(INITIAL_RETRY_DELAY * (2 ** attempt), MAX_RETRY_DELAY)
                logger.info(f"Sub-Agent [{section}] Retrying in {delay:.1f}s...")
                await asyncio.sleep(delay)
    
    # All retries exhausted
    logger.error(f"Sub-Agent [{section}] Failed after {MAX_RETRIES} attempts. Last error: {last_error}")
    return {"data": None, "raw": f"Error in {section} after {MAX_RETRIES} attempts: {last_error}"}

# --- Graph Nodes ---

def supervisor_node(state: AgentState) -> Dict[str, Any]:
    """Orchestrates the next task in the queue."""
    if not state.get("tasks_to_do"):
        logger.info("Supervisor: All tasks complete. Moving to Aggregator.")
        return {"current_task": "aggregator"}
    
    tasks = state["tasks_to_do"].copy()
    next_task = tasks.pop(0)
    logger.info(f"Supervisor: Delegating '{next_task}' to sub-agent. {len(tasks)} tasks remaining.")
    return {"current_task": next_task, "tasks_to_do": tasks}

def researcher_node(state: AgentState) -> Dict[str, Any]:
    """Web research node - only active for local models."""
    if state["is_cloud_provider"]:
        return {"aggregated_research": "[Cloud Tier: Internal Knowledge Base Active]"}
        
    logger.info("Researcher Agent: Scraping latest macro data...")
    search = DuckDuckGoSearchRun()
    queries = [
        "latest macro economic dates CPI PPI Jobs 2026",
        "G7 central bank rates guidance 2026",
        "credit spreads mid-cap ICR 2026"
    ]
    results = []
    for q in queries:
        try: results.append(f"### {q}\n{search.run(q)}")
        except: continue
    
    return {"aggregated_research": "\n\n".join(results)}

async def calendar_agent(state: AgentState) -> Dict[str, Any]:
    instruction = (
        "Extract macro dates for CPI, PPI, Jobs, Retail Sales, FED, BOJ, BOE, ECB. "
        "For each date, include: 'event', 'last_date' (YYYY-MM-DD), 'last_period' (e.g. March 2026), "
        "'next_date' (YYYY-MM-DD), 'consensus', 'actual', 'signal' (BEAT/MISS), and a detailed 'note' explaining the driver. "
        "For central bank rates, include: 'bank', 'rate', 'last_decision_date', 'last_decision' (Hold/Cut/Hike), "
        "'next_date', and detailed 'guidance'. "
        "Also provide a 'g7_rates_summary' list with 'country', 'rate', and 'bank'."
    )
    res = await _call_sub_agent(state, "Calendar", instruction)
    return {"calendar_data": res["data"], "raw_responses": [res["raw"]]}

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
    res = await _call_sub_agent(state, "Risk", instruction)
    return {"risk_data": res["data"], "raw_responses": [res["raw"]]}

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
    res = await _call_sub_agent(state, "Credit", instruction)
    return {"credit_data": res["data"], "raw_responses": [res["raw"]]}

async def strategy_agent(state: AgentState) -> Dict[str, Any]:
    instruction = (
        "Analyze macro-economic strategy. Return a JSON with: "
        "'events' (list of objects with 'title', 'category' (GEOPOLITICAL/ECONOMIC_DATA/LEGAL/CREDIT/TRADE/RATE_DECISION), "
        "'severity' (CRITICAL/HIGH/MEDIUM/LOW), 'description' (detailed), 'potential_impact' (detailed)), "
        "'portfolio_suggestions' (list of objects with 'asset_class', 'percentage' (e.g. 30%), 'rationale' (detailed)), "
        "and 'risk_mitigation_steps' (list of detailed strings)."
    )
    res = await _call_specialized_llm_internal(state, "Strategy", instruction)
    return {"strategy_data": res["data"], "raw_responses": [res["raw"]]}

async def _call_specialized_llm_internal(state, name, instr):
    # Wrapper for strategy since it uses a slightly different structure
    return await _call_sub_agent(state, name, instr)

def aggregator_node(state: AgentState) -> Dict[str, Any]:
    """Compiles sub-agent outputs into final dashboard."""
    logger.info("Aggregator: Constructing final dashboard report...")
    
    # Track which sections have valid data
    missing_sections = []
    
    cal = state.get("calendar_data")
    risk = state.get("risk_data")
    credit = state.get("credit_data")
    strat = state.get("strategy_data")
    
    if not cal:
        missing_sections.append("calendar")
        cal = {"dates": [], "rates": []}
    
    if not risk:
        missing_sections.append("risk")
        risk = {"score": 5, "summary": "No data - API failed", "contagion_analysis": "N/A"}
    
    if not credit:
        missing_sections.append("credit")
        credit = {
            "mid_cap_avg_icr": 0, "sectoral_breakdown": [], "pik_debt_issuance": "N/A",
            "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A",
            "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False
        }
    
    if not strat:
        missing_sections.append("strategy")
        strat = {"events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []}
    
    if missing_sections:
        logger.warning(f"Aggregator: Missing data from sections: {', '.join(missing_sections)}")

    combined = {
        "calendar": cal, "risk": risk, "credit": credit,
        "events": strat.get("events", []),
        "portfolio_suggestions": strat.get("portfolio_suggestions", []),
        "risk_mitigation_steps": strat.get("risk_mitigation_steps", [])
    }
    
    try:
        dashboard = MacroDashboardResponse.model_validate(combined)
        return {"dashboard_data": dashboard}
    except Exception as e:
        logger.warning(f"Aggregator Pydantic Fallback: {e}")
        return {"dashboard_data": MacroDashboardResponse(**combined)}

# --- Graph Definition ---

def create_agent_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("calendar", calendar_agent)
    workflow.add_node("risk", risk_agent)
    workflow.add_node("credit", credit_agent)
    workflow.add_node("strategy", strategy_agent)
    workflow.add_node("aggregator", aggregator_node)
    
    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "supervisor")
    
    # Conditional logic from Supervisor
    workflow.add_conditional_edges(
        "supervisor",
        lambda x: x["current_task"],
        {
            "calendar": "calendar",
            "risk": "risk",
            "credit": "credit",
            "strategy": "strategy",
            "aggregator": "aggregator"
        }
    )
    
    # Each worker returns to supervisor for the next task
    workflow.add_edge("calendar", "supervisor")
    workflow.add_edge("risk", "supervisor")
    workflow.add_edge("credit", "supervisor")
    workflow.add_edge("strategy", "supervisor")
    
    workflow.add_edge("aggregator", END)
    
    return workflow.compile()

# --- Execution ---

macro_agent = create_agent_graph()

async def stream_macro_dashboard(provider_name: str, skip_cache: bool = False) -> AsyncGenerator[str, None]:
    if not skip_cache:
        cached = _load_daily_cache(provider_name)
        if cached:
            yield json.dumps({"status": "research_start", "message": "Loading from daily cache..."})
            yield json.dumps({"status": "analysis_complete", "data": cached["dashboard_data"]})
            return

    initial_state = {
        "provider_name": provider_name,
        "is_cloud_provider": _is_cloud(provider_name),
        "tasks_to_do": ["calendar", "risk", "credit", "strategy"],
        "current_task": None,
        "aggregated_research": "",
        "raw_responses": [],
        "calendar_data": None, "risk_data": None, "credit_data": None, "strategy_data": None,
        "dashboard_data": None
    }
    
    yield json.dumps({"status": "research_start", "message": f"Orchestrating agents for {provider_name}..."})
    
    full_state = initial_state.copy()
    async for output in macro_agent.astream(initial_state):
        for node_name, state_update in output.items():
            if "raw_responses" in state_update:
                full_state["raw_responses"] = full_state.get("raw_responses", []) + state_update["raw_responses"]
            for key, value in state_update.items():
                if key != "raw_responses":
                    full_state[key] = value

            if node_name == "researcher":
                msg = "Using internal cloud knowledge." if full_state["is_cloud_provider"] else "Web research complete."
                yield json.dumps({"status": "routing", "message": msg})
            elif node_name in ["calendar", "risk", "credit", "strategy"]:
                status_msg = f"Completed {node_name} analysis."
                if state_update.get(f"{node_name}_data") is None:
                    status_msg = f"{node_name.capitalize()} analysis failed."
                yield json.dumps({"status": "analysis_progress", "message": status_msg})
            elif node_name == "aggregator":
                data = state_update["dashboard_data"]
                raw_joined = "\n---\n".join(full_state.get("raw_responses", []))
                errors = [raw for raw in full_state.get("raw_responses", []) if isinstance(raw, str) and (raw.startswith("Error in") or "quota" in raw.lower())]
                
                # If everything failed, try high-fidelity fallback
                if errors and len(errors) >= len(full_state["tasks_to_do"]):
                    fallback_path = Path(__file__).resolve().parent / "fallback_dashboard.json"
                    if fallback_path.exists():
                        logger.info("Aggregator: All sub-agents failed. Loading high-fidelity fallback_dashboard.json")
                        try:
                            fallback_json = json.loads(fallback_path.read_text(encoding="utf-8"))
                            # Update the timestamp/generated_at to now
                            fallback_json["generated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                            yield json.dumps({"status": "analysis_complete", "data": fallback_json, "message": "Using high-fidelity fallback due to API errors."})
                            return
                        except Exception as fe:
                            logger.error(f"Aggregator: Failed to load fallback file: {fe}")

                    error_message = "All provider sections failed and no fallback available."
                    yield json.dumps({"status": "error", "message": error_message, "raw_response": raw_joined})
                else:
                    if errors:
                        logger.warning(f"Partial provider failures detected: {errors}")
                    dashboard_json = data.model_dump()
                    _save_cache(provider_name, dashboard_json, raw_joined)
                    yield json.dumps({"status": "analysis_complete", "data": dashboard_json, "raw_response": raw_joined})

def generate_macro_dashboard(provider_name: str, skip_cache: bool = False) -> MacroDashboardResponse:
    # Synchronous wrapper for non-streaming calls
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def run():
        if not skip_cache:
            cached = _load_daily_cache(provider_name)
            if cached: return MacroDashboardResponse.model_validate(cached["dashboard_data"])
        
        initial_state = {
            "provider_name": provider_name,
            "is_cloud_provider": _is_cloud(provider_name),
            "tasks_to_do": ["calendar", "risk", "credit", "strategy"],
            "current_task": None,
            "aggregated_research": "",
            "raw_responses": [],
            "calendar_data": None, "risk_data": None, "credit_data": None, "strategy_data": None,
            "dashboard_data": None
        }
        final = await macro_agent.ainvoke(initial_state)
        return final["dashboard_data"]
        
    return loop.run_until_complete(run())

def _load_latest_dashboard() -> dict | None:
    if not _LATEST_CACHE_PATH.exists(): return None
    try: return json.loads(_LATEST_CACHE_PATH.read_text(encoding="utf-8"))
    except: return None
