import json
from typing import List, Dict, Any, TypedDict, Annotated, AsyncGenerator
import operator
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langgraph.graph import StateGraph, END
from models import MacroDashboardResponse
from providers import get_provider

# Define the state for our agent
class AgentState(TypedDict):
    provider_name: str
    search_queries: List[str]
    aggregated_research: str
    dashboard_data: MacroDashboardResponse

def research_node(state: AgentState) -> Dict[str, Any]:
    """Node that executes web searches to gather data."""
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

def analyze_node(state: AgentState) -> Dict[str, Any]:
    """Node that analyzes the research and generates the dashboard response."""
    provider = get_provider(state["provider_name"])
    model = provider.get_model()
    
    # Use with_structured_output for more reliable schema adherence across providers
    try:
        structured_model = model.with_structured_output(MacroDashboardResponse)
    except Exception:
        structured_model = None

    system_prompt = """
    You are a professional Macro-Economic Analyst. Your task is to provide a comprehensive daily dashboard.
    
    RESEARCH DATA:
    {research_data}
    
    ### MANDATORY OUTPUT FORMAT ###
    You MUST return a raw JSON object. 
    CRITICAL: DO NOT use any wrapper keys like "market_intelligence_report", "report", or "data".
    CRITICAL: The root of your JSON must be an object containing exactly these keys: 
    "calendar", "risk", "credit", "events", "portfolio_suggestions", "risk_mitigation_steps".

    ### EXTRACTION REQUIREMENTS ###
    1. Extract last/next dates for CPI, PPI, JOBS, Retail Sales, FED, BOJ, BOE, and ECB.
    2. List current G7 central bank rates and their latest guidance.
    3. Analyze crypto-to-equity/gold contagion.
    4. Provide a Risk Sentiment Score (1-10).
    5. IF score >= 8: Provide deep-dive on safe-haven assets (Gold/USD).
    6. Report on Credit Health: PIK debt, CRE Delinquency, Mid-Cap HY OAS, CP Spreads, CDX.
    7. Track Mid-cap ICRs and top 5 high-debt firms with ICR < 1.2x.
    8. List today's major market/legal events.
    9. Provide actionable portfolio allocation and risk mitigation.

    DO NOT include any conversational text, preamble, or markdown code blocks (like ```json).
    Just the raw JSON object.
    """

    if structured_model and state["provider_name"].lower() != "ollama":
        # Structured output usually works great for Claude/Gemini
        prompt = ChatPromptTemplate.from_template(system_prompt)
        chain = prompt | structured_model
        response = chain.invoke({"research_data": state["aggregated_research"]})
        return {"dashboard_data": response}
    else:
        # For Ollama or as fallback, use the parser with very explicit instructions
        parser = PydanticOutputParser(pydantic_object=MacroDashboardResponse)
        format_instructions = parser.get_format_instructions()
        
        # Injecting a "Zero-Tolerance" warning for local models
        full_prompt = system_prompt + f"\n\nJSON SCHEMA AND FORMAT INSTRUCTIONS:\n{format_instructions}\n\nREMEMBER: Return ONLY the JSON. No wrappers."
        
        prompt = ChatPromptTemplate.from_template(full_prompt)
        chain = prompt | model | parser
        response = chain.invoke({
            "research_data": state["aggregated_research"]
        })
        return {"dashboard_data": response}

def create_agent_graph():
    """Creates the LangGraph state machine."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("researcher", research_node)
    workflow.add_node("analyst", analyze_node)
    
    # Define edges
    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "analyst")
    workflow.add_edge("analyst", END)
    
    return workflow.compile()

# Global agent instance
macro_agent = create_agent_graph()

def generate_macro_dashboard(provider_name: str) -> MacroDashboardResponse:
    """Entry point for the macro dashboard generation."""
    
    initial_state: AgentState = {
        "provider_name": provider_name,
        "search_queries": [
            "latest macro economic dates CPI PPI Jobs Retail Sales FED BOJ BOE ECB next dates",
            "current G7 central bank interest rates and guidance 2026",
            "crypto to equity and gold contagion analysis 2026",
            "current VIX, 10Y yields, and geopolitical risk sentiment analysis",
            "mid-cap high-yield OAS, CP spreads, and VIX of credit CDX current levels",
            "average interest coverage ratio mid-cap companies 2026",
            "PIK debt issuance and CRE delinquency rates 2026",
            "major legal events today US Supreme Court Trump tariff case",
            "oil prices today and supply chain disruptions 2026"
        ],
        "aggregated_research": "",
        "dashboard_data": None # Will be filled by analyst
    }
    
    final_state = macro_agent.invoke(initial_state)
    return final_state["dashboard_data"]

async def stream_macro_dashboard(provider_name: str) -> AsyncGenerator[str, None]:
    """Asynchronous generator to stream research progress."""
    initial_state: AgentState = {
        "provider_name": provider_name,
        "search_queries": [
            "latest macro economic dates CPI PPI Jobs Retail Sales FED BOJ BOE ECB next dates",
            "current G7 central bank interest rates and guidance 2026",
            "crypto to equity and gold contagion analysis 2026",
            "current VIX, 10Y yields, and geopolitical risk sentiment analysis",
            "mid-cap high-yield OAS, CP spreads, and VIX of credit CDX current levels",
            "average interest coverage ratio mid-cap companies 2026",
            "PIK debt issuance and CRE delinquency rates 2026",
            "major legal events today US Supreme Court Trump tariff case",
            "oil prices today and supply chain disruptions 2026"
        ],
        "aggregated_research": "",
        "dashboard_data": None
    }
    
    # Send initial status
    yield json.dumps({"status": "research_start", "message": "Agent is initiating research..."})
    
    # Use astream for asynchronous streaming
    async for output in macro_agent.astream(initial_state):
        # output is a dict where keys are node names
        for node_name, state_update in output.items():
            if node_name == "researcher":
                yield json.dumps({"status": "research_complete", "message": "Web search research phase finished."})
                yield json.dumps({"status": "analysis_start", "message": "Analyst is processing gathered data..."})
            elif node_name == "analyst":
                if "dashboard_data" in state_update:
                    dashboard_json = state_update["dashboard_data"].model_dump()
                    yield json.dumps({"status": "analysis_complete", "data": dashboard_json})
