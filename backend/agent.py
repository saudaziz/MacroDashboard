import json
import re
import time
import asyncio
import operator
import os
from dotenv import load_dotenv
from typing import List, Dict, Any, TypedDict, Annotated, AsyncGenerator, Optional
from pathlib import Path
from datetime import datetime

# Load environment variables
load_dotenv()

from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.messages import HumanMessage
from langgraph.graph import StateGraph, END

try:
    from backend.models import MacroDashboardResponse
    from backend.providers import get_provider
except ImportError:
    from models import MacroDashboardResponse
    from providers import get_provider

# --- Cache Configuration ---
CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
_LATEST_CACHE_PATH = Path(__file__).resolve().parent / "latest_dashboard.json"

def _get_daily_cache_path(provider_name: str) -> Path:
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    provider = provider_name.lower().replace(" ", "_")
    return CACHE_DIR / f"{provider}_{date_str}.json"

def _load_daily_cache(provider_name: str) -> dict | None:
    path = _get_daily_cache_path(provider_name)
    if not path.exists():
        return None
    try:
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("date") == datetime.utcnow().strftime("%Y-%m-%d"):
            return cached
    except Exception as exc:
        print(f"Failed to load daily cache {path}: {exc}")
    return None

def _save_daily_cache(provider_name: str, dashboard_data: Any, raw_response: str, llm_request: str | None = None, token_stats: dict | None = None) -> None:
    path = _get_daily_cache_path(provider_name)
    try:
        payload = {
            "provider": provider_name,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "timestamp": time.time(),
            "dashboard_data": dashboard_data,
            "raw_response": raw_response,
        }
        if llm_request is not None: payload["llm_request"] = llm_request
        if token_stats is not None: payload["token_stats"] = token_stats
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except Exception as exc:
        print(f"Failed to save daily cache {path}: {exc}")

def _load_latest_dashboard() -> dict | None:
    if not _LATEST_CACHE_PATH.exists():
        return None
    try:
        return json.loads(_LATEST_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"Failed to load latest dashboard cache {_LATEST_CACHE_PATH}: {exc}")
        return None

def _save_latest_dashboard(provider_name: str, dashboard_data: Any, raw_response: str, llm_request: str | None = None, token_stats: dict | None = None) -> None:
    try:
        payload = {
            "provider": provider_name,
            "timestamp": time.time(),
            "dashboard_data": dashboard_data,
            "raw_response": raw_response,
        }
        if llm_request is not None: payload["llm_request"] = llm_request
        if token_stats is not None: payload["token_stats"] = token_stats
        _LATEST_CACHE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except Exception as exc:
        print(f"Failed to save latest dashboard cache {_LATEST_CACHE_PATH}: {exc}")

# --- State Definition ---

class AgentState(TypedDict):
    provider_name: str
    is_cloud_provider: bool
    search_queries: List[str]
    aggregated_research: str
    
    # Partial results from specialized nodes
    calendar_data: Dict[str, Any]
    risk_data: Dict[str, Any]
    credit_data: Dict[str, Any]
    events_data: List[Any]
    suggestions_data: List[Any]
    mitigation_data: List[str]
    
    # Final combined output
    dashboard_data: MacroDashboardResponse
    
    # Metadata
    raw_responses: Annotated[List[str], operator.add]
    token_stats: Annotated[Dict[str, int], operator.ior]

# --- Helper Functions ---

def _estimate_tokens(text: str) -> int:
    return max(0, len(re.findall(r"\S+", text)))

def _is_cloud(provider_name: str) -> bool:
    return provider_name.lower() in ["gemini", "claude"]

# --- Nodes ---

def router_node(state: AgentState) -> Dict[str, Any]:
    """Determines if research is needed based on provider type."""
    is_cloud = _is_cloud(state["provider_name"])
    return {"is_cloud_provider": is_cloud}

def research_node(state: AgentState) -> Dict[str, Any]:
    """Executes web searches ONLY if not a cloud provider."""
    if state.get("is_cloud_provider"):
        return {"aggregated_research": "[Cloud Provider: Relying on internal knowledge]"}
        
    search = DuckDuckGoSearchRun()
    queries = state.get("search_queries", [])
    research_results = ""
    
    for query in queries:
        try:
            result = search.run(query)
            research_results += f"\n\n### Query: {query}\n{result}"
        except Exception as e:
            research_results += f"\n\n### Query: {query}\nError: {str(e)}"
            
    return {"aggregated_research": research_results}

def _call_specialized_llm(state: AgentState, section_name: str, instruction: str) -> Dict[str, Any]:
    provider = get_provider(state["provider_name"])
    model = provider.get_model()
    
    research_context = ""
    if not state.get("is_cloud_provider"):
        research_context = "\n\nRESEARCH DATA:\n" + (state.get('aggregated_research', '')[:5000])

    prompt_text = "You are a professional Macro-Economic Analyst specialized in " + section_name + ".\n" + \
                  instruction + "\n" + research_context + "\n\n" + \
                  "Return ONLY a raw JSON object. No preamble or code blocks."
    
    message = HumanMessage(content=prompt_text)
    
    try:
        response = model.invoke([message])
        content = response.content if hasattr(response, 'content') else str(response)
        
        json_match = re.search(r"(\{.*\})|(\[.*\])", content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
            
        data = json.loads(content)
        return {"data": data, "raw": content, "tokens": _estimate_tokens(content)}
    except Exception as e:
        print(f"Error in {section_name} node: {e}")
        return {"data": {}, "raw": f"Error: {e}", "tokens": 0}

def calendar_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    Extract dates for CPI, PPI, JOBS, Retail Sales, FED.
    Format: {"dates": [{"event": string, "last_date": string, "next_date": string, "consensus": string}], "rates": [{"bank": string, "rate": string, "guidance": string}]}
    """
    res = _call_specialized_llm(state, "Calendar & Rates", instruction)
    return {"calendar_data": res["data"], "raw_responses": [res["raw"]]}

def risk_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    Analyze market risk (1-10) and contagion.
    Format: {"score": int, "summary": string, "gold_technical": string, "usd_technical": string, "safe_haven_analysis": string, "contagion_analysis": string}
    """
    res = _call_specialized_llm(state, "Risk Sentiment", instruction)
    return {"risk_data": res["data"], "raw_responses": [res["raw"]]}

def credit_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    Analyze Credit Health.
    Format: {"mid_cap_avg_icr": float, "sectoral_breakdown": [{"sector": string, "average_icr": float}], "pik_debt_issuance": string, "cre_delinquency_rate": string, "mid_cap_hy_oas": string, "cp_spreads": string, "vix_of_credit_cdx": string, "watchlist": [{"firm_name": string, "debt_load": string, "icr": float, "insider_selling": string, "cds_pricing": string}], "alert": bool}
    """
    res = _call_specialized_llm(state, "Credit Health", instruction)
    return {"credit_data": res["data"], "raw_responses": [res["raw"]]}

def strategy_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    List events and portfolio suggestions.
    Format: {"events": [{"title": string, "description": string, "potential_impact": string}], "portfolio_suggestions": [{"asset_class": string, "percentage": string, "rationale": string}], "risk_mitigation_steps": [string]}
    """
    res = _call_specialized_llm(state, "Strategy & Events", instruction)
    data = res["data"]
    return {
        "events_data": data.get("events", []),
        "suggestions_data": data.get("portfolio_suggestions", []),
        "mitigation_data": data.get("risk_mitigation_steps", []),
        "raw_responses": [res["raw"]]
    }

def aggregator_node(state: AgentState) -> Dict[str, Any]:
    """Combines all partial results into the final Pydantic model."""
    combined = {
        "calendar": state.get("calendar_data") or {"dates": [], "rates": []},
        "risk": state.get("risk_data") or {"score": 5, "summary": "N/A", "contagion_analysis": "N/A"},
        "credit": state.get("credit_data") or {
            "mid_cap_avg_icr": 0, "sectoral_breakdown": [], "pik_debt_issuance": "N/A",
            "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A",
            "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False
        },
        "events": state.get("events_data") or [],
        "portfolio_suggestions": state.get("suggestions_data") or [],
        "risk_mitigation_steps": state.get("mitigation_data") or []
    }
    
    try:
        dashboard = MacroDashboardResponse.model_validate(combined)
        return {"dashboard_data": dashboard}
    except Exception as e:
        print(f"Aggregation error: {e}")
        # Return a safe fallback with default values for missing/incorrect fields
        return {"dashboard_data": MacroDashboardResponse(**combined)}

# --- Graph Creation ---

def create_agent_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("router", router_node)
    workflow.add_node("researcher", research_node)
    workflow.add_node("calendar", calendar_node)
    workflow.add_node("risk", risk_node)
    workflow.add_node("credit", credit_node)
    workflow.add_node("strategy", strategy_node)
    workflow.add_node("aggregator", aggregator_node)
    
    workflow.set_entry_point("router")
    workflow.add_edge("router", "researcher")
    workflow.add_edge("researcher", "calendar")
    workflow.add_edge("calendar", "risk")
    workflow.add_edge("risk", "credit")
    workflow.add_edge("credit", "strategy")
    workflow.add_edge("strategy", "aggregator")
    workflow.add_edge("aggregator", END)
    
    return workflow.compile()

# --- Execution Logic ---

macro_agent = create_agent_graph()

def generate_macro_dashboard(provider_name: str) -> MacroDashboardResponse:
    cached = _load_daily_cache(provider_name)
    if cached:
        _save_latest_dashboard(provider_name, cached["dashboard_data"], cached.get("raw_response", ""))
        return MacroDashboardResponse.model_validate(cached["dashboard_data"])

    initial_state = {
        "provider_name": provider_name,
        "search_queries": [
            "latest macro economic dates CPI PPI Jobs Retail Sales 2026",
            "G7 central bank rates and guidance 2026",
            "crypto equity contagion and safe haven technicals 2026",
            "credit spreads mid-cap ICR and CRE delinquency 2026"
        ],
        "aggregated_research": "",
        "raw_responses": [],
        "token_stats": {},
        "calendar_data": None,
        "risk_data": None,
        "credit_data": None,
        "events_data": None,
        "suggestions_data": None,
        "mitigation_data": None
    }
    final_state = macro_agent.invoke(initial_state)
    dashboard_json = final_state["dashboard_data"].model_dump()
    raw_responses_joined = "\n---\n".join(final_state.get("raw_responses", []))
    _save_daily_cache(provider_name, dashboard_json, raw_responses_joined)
    _save_latest_dashboard(provider_name, dashboard_json, raw_responses_joined)
    return final_state["dashboard_data"]

async def stream_macro_dashboard(provider_name: str) -> AsyncGenerator[str, None]:
    daily_cached = _load_daily_cache(provider_name)
    if daily_cached:
        yield json.dumps({"status": "research_start", "message": "Serving from daily cache file"})
        yield json.dumps({"status": "analysis_complete", "data": daily_cached["dashboard_data"]})
        return

    initial_state = {
        "provider_name": provider_name,
        "search_queries": [
            "latest macro economic dates CPI PPI Jobs Retail Sales 2026",
            "G7 central bank rates and guidance 2026",
            "crypto equity contagion and safe haven technicals 2026",
            "credit spreads mid-cap ICR and CRE delinquency 2026"
        ],
        "aggregated_research": "",
        "raw_responses": [],
        "token_stats": {},
        "calendar_data": None,
        "risk_data": None,
        "credit_data": None,
        "events_data": None,
        "suggestions_data": None,
        "mitigation_data": None
    }
    
    yield json.dumps({"status": "research_start", "message": f"Initiating workflow for {provider_name}..."})
    
    full_state = initial_state.copy()
    async for output in macro_agent.astream(initial_state):
        for node_name, state_update in output.items():
            full_state.update(state_update)
            if node_name == "router":
                is_cloud = state_update.get("is_cloud_provider")
                msg = "Cloud model: Using internal knowledge." if is_cloud else "Local model: Initiating web research."
                yield json.dumps({"status": "routing", "message": msg})
            elif node_name == "researcher":
                yield json.dumps({"status": "research_complete", "message": "Research phase finished."})
            elif node_name in ["calendar", "risk", "credit", "strategy"]:
                yield json.dumps({"status": "analysis_progress", "message": f"Analyzed {node_name} section."})
            elif node_name == "aggregator":
                data = state_update["dashboard_data"]
                dashboard_json = data.model_dump()
                raw_responses_joined = "\n---\n".join(full_state.get("raw_responses", []))
                _save_daily_cache(provider_name, dashboard_json, raw_responses_joined)
                _save_latest_dashboard(provider_name, dashboard_json, raw_responses_joined)
                yield json.dumps({"status": "analysis_complete", "data": dashboard_json})
