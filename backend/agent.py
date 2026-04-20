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
            logger.info(f"Daily cache hit: {path}")
            return cached
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

    provider = get_provider(provider_name)
    model = provider.get_model()
    
    context = ""
    if not state["is_cloud_provider"]:
        context = "\n\nRESEARCH CONTEXT:\n" + state.get("aggregated_research", "")[:5000]

    prompt = (
        f"You are a specialized Macro Sub-Agent for: {section}.\n"
        f"{instruction}\n{context}\n\n"
        "Return ONLY valid raw JSON. No markdown, no preamble."
    )
    
    try:
        response = await model.ainvoke([HumanMessage(content=prompt)])
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Extract JSON
        json_match = re.search(r"(\{.*\})|(\[.*\])", content, re.DOTALL)
        clean_content = json_match.group(0) if json_match else content
        return {"data": json.loads(clean_content), "raw": clean_content}
    except Exception as e:
        logger.error(f"Sub-Agent [{section}] Failed: {e}")
        return {"data": None, "raw": f"Error in {section}: {e}"}

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
    instruction = "Extract exact dates for CPI, PPI, Jobs, FED. Format: {'dates': [{'event': 'CPI', 'last_date': '...', 'next_date': '...', 'consensus': '...'}], 'rates': [{'bank': 'FED', 'rate': '...', 'guidance': '...'}]}"
    res = await _call_sub_agent(state, "Calendar", instruction)
    return {"calendar_data": res["data"], "raw_responses": [res["raw"]]}

async def risk_agent(state: AgentState) -> Dict[str, Any]:
    instruction = "Analyze risk sentiment (1-10) and contagion. Format: {'score': 7, 'summary': '...', 'contagion_analysis': '...', 'gold_technical': '...', 'usd_technical': '...'}"
    res = await _call_sub_agent(state, "Risk", instruction)
    return {"risk_data": res["data"], "raw_responses": [res["raw"]]}

async def credit_agent(state: AgentState) -> Dict[str, Any]:
    instruction = "Analyze Credit Health. Format: {'mid_cap_avg_icr': 1.5, 'sectoral_breakdown': [{'sector': '...', 'average_icr': 1.2}], 'pik_debt_issuance': '...', 'cre_delinquency_rate': '...', 'mid_cap_hy_oas': '...', 'cp_spreads': '...', 'vix_of_credit_cdx': '...', 'watchlist': [{'firm_name': '...', 'debt_load': '...', 'icr': 1.1, 'insider_selling': '...', 'cds_pricing': '...'}], 'alert': false}"
    res = await _call_sub_agent(state, "Credit", instruction)
    return {"credit_data": res["data"], "raw_responses": [res["raw"]]}

async def strategy_agent(state: AgentState) -> Dict[str, Any]:
    instruction = "List events and portfolio moves. Format: {'events': [{'title': '...', 'description': '...', 'potential_impact': '...'}], 'portfolio_suggestions': [{'asset_class': '...', 'percentage': '...', 'rationale': '...'}], 'risk_mitigation_steps': ['...']}"
    res = await _call_specialized_llm_internal(state, "Strategy", instruction)
    return {"strategy_data": res["data"], "raw_responses": [res["raw"]]}

async def _call_specialized_llm_internal(state, name, instr):
    # Wrapper for strategy since it uses a slightly different structure
    return await _call_sub_agent(state, name, instr)

def aggregator_node(state: AgentState) -> Dict[str, Any]:
    """Compiles sub-agent outputs into final dashboard."""
    logger.info("Aggregator: Constructing final dashboard report...")
    
    cal = state.get("calendar_data") or {"dates": [], "rates": []}
    risk = state.get("risk_data") or {"score": 5, "summary": "No data", "contagion_analysis": "N/A"}
    credit = state.get("credit_data") or {
        "mid_cap_avg_icr": 0, "sectoral_breakdown": [], "pik_debt_issuance": "N/A",
        "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A",
        "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False
    }
    strat = state.get("strategy_data") or {"events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []}

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

async def stream_macro_dashboard(provider_name: str) -> AsyncGenerator[str, None]:
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
            full_state.update(state_update)
            
            if node_name == "researcher":
                msg = "Using internal cloud knowledge." if full_state["is_cloud_provider"] else "Web research complete."
                yield json.dumps({"status": "routing", "message": msg})
            elif node_name in ["calendar", "risk", "credit", "strategy"]:
                yield json.dumps({"status": "analysis_progress", "message": f"Completed {node_name} analysis."})
            elif node_name == "aggregator":
                data = state_update["dashboard_data"]
                dashboard_json = data.model_dump()
                _save_cache(provider_name, dashboard_json, "\n---\n".join(full_state["raw_responses"]))
                yield json.dumps({"status": "analysis_complete", "data": dashboard_json})

def generate_macro_dashboard(provider_name: str) -> MacroDashboardResponse:
    # Synchronous wrapper for non-streaming calls
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    async def run():
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
