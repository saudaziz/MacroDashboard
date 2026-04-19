import json
import re
import time
import asyncio
import operator
from typing import List, Dict, Any, TypedDict, Annotated, AsyncGenerator, Optional
from pathlib import Path
from datetime import datetime

from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.graph import StateGraph, END

try:
    from backend.models import MacroDashboardResponse
    from backend.providers import get_provider
except ImportError:
    from models import MacroDashboardResponse
    from providers import get_provider

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
    suggestions_data: List[str]
    mitigation_data: List[str]
    
    # Final combined output
    dashboard_data: MacroDashboardResponse
    
    # Metadata
    raw_responses: List[str]
    token_stats: Dict[str, int]

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
        research_context = f"\n\nRESEARCH DATA:\n{state.get('aggregated_research', '')[:5000]}"

    prompt_text = f"""
    You are a professional Macro-Economic Analyst specialized in {section_name}.
    {instruction}
    {research_context}
    
    Return ONLY a raw JSON object. No preamble or code blocks.
    """
    
    prompt = ChatPromptTemplate.from_template(prompt_text)
    chain = prompt | model
    
    try:
        response = chain.invoke({})
        content = response.content if hasattr(response, 'content') else str(response)
        
        # Clean JSON if model includes markdown blocks
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
    Extract last/next dates for CPI, PPI, JOBS, Retail Sales, FED, BOJ, BOE, and ECB.
    Also list current G7 central bank rates and their latest guidance.
    
    Format: {"dates": [{"event": string, "last_date": string, "next_date": string, "consensus": string}], "rates": [{"bank": string, "rate": string, "guidance": string}]}
    """
    res = _call_specialized_llm(state, "Calendar & Rates", instruction)
    return {"calendar_data": res["data"], "raw_responses": [res["raw"]]}

def risk_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    Analyze current market risk sentiment and provide a score (1-10).
    Analyze crypto-to-equity/gold contagion. 
    If risk score >= 8, provide safe-haven analysis (Gold/USD).
    
    Format: {"score": int, "summary": string, "contagion_analysis": string, "gold_technical": string, "usd_technical": string}
    """
    res = _call_specialized_llm(state, "Risk Sentiment", instruction)
    return {"risk_data": res["data"], "raw_responses": [res["raw"]]}

def credit_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    Analyze Credit Health: PIK debt, CRE Delinquency, Mid-Cap HY OAS, CP Spreads, CDX.
    Track Mid-cap ICRs (Interest Coverage Ratios).
    
    Format: {"mid_cap_avg_icr": float, "sectoral_breakdown": [], "pik_debt_issuance": string, "cre_delinquency_rate": string, "mid_cap_hy_oas": string, "cp_spreads": string, "vix_of_credit_cdx": string, "watchlist": [], "alert": bool}
    """
    res = _call_specialized_llm(state, "Credit Health", instruction)
    return {"credit_data": res["data"], "raw_responses": [res["raw"]]}

def strategy_node(state: AgentState) -> Dict[str, Any]:
    instruction = """
    List today's major market/legal events.
    Provide actionable portfolio allocation suggestions and risk mitigation steps.
    
    Format: {"events": [string], "portfolio_suggestions": [string], "risk_mitigation_steps": [string]}
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
        "calendar": state.get("calendar_data", {"dates": [], "rates": []}),
        "risk": state.get("risk_data", {"score": 5, "summary": "N/A", "contagion_analysis": "N/A"}),
        "credit": state.get("credit_data", {
            "mid_cap_avg_icr": 0, "sectoral_breakdown": [], "pik_debt_issuance": "N/A",
            "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A",
            "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False
        }),
        "events": state.get("events_data", []),
        "portfolio_suggestions": state.get("suggestions_data", []),
        "risk_mitigation_steps": state.get("mitigation_data", [])
    }
    
    # Ensure correct types for Pydantic
    try:
        dashboard = MacroDashboardResponse.model_validate(combined)
        return {"dashboard_data": dashboard}
    except Exception as e:
        print(f"Aggregation error: {e}")
        # Return a safe fallback
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
    workflow.add_edge("researcher", "risk")
    workflow.add_edge("researcher", "credit")
    workflow.add_edge("researcher", "strategy")
    
    workflow.add_edge("calendar", "aggregator")
    workflow.add_edge("risk", "aggregator")
    workflow.add_edge("credit", "aggregator")
    workflow.add_edge("strategy", "aggregator")
    
    workflow.add_edge("aggregator", END)
    
    return workflow.compile()

# --- Execution Logic ---

macro_agent = create_agent_graph()

def generate_macro_dashboard(provider_name: str) -> MacroDashboardResponse:
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
        "token_stats": {}
    }
    final_state = macro_agent.invoke(initial_state)
    return final_state["dashboard_data"]

async def stream_macro_dashboard(provider_name: str) -> AsyncGenerator[str, None]:
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
        "token_stats": {}
    }
    
    yield json.dumps({"status": "research_start", "message": f"Initiating workflow for {provider_name}..."})
    
    async for output in macro_agent.astream(initial_state):
        for node_name, state_update in output.items():
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
                yield json.dumps({"status": "analysis_complete", "data": data.model_dump()})
