import json
import re
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
        safe_instructions = format_instructions.replace("{", "{{").replace("}", "}}")
        full_prompt = system_prompt + f"\n\nJSON SCHEMA AND FORMAT INSTRUCTIONS:\n{safe_instructions}\n\nREMEMBER: Return ONLY the JSON. No wrappers."
        
        prompt = ChatPromptTemplate.from_template(full_prompt)
        chain = prompt | model
        
        raw_response = chain.invoke({"research_data": state["aggregated_research"]})
        content = raw_response.content if hasattr(raw_response, 'content') else str(raw_response)

        try:
            # 1. Try standard parser
            return {"dashboard_data": parser.parse(content)}
        except Exception as parse_err:
            # 2. Heuristic Repair: Try to find JSON and normalize schema variations
            try:
                json_match = re.search(r"(\{.*\})", content, re.DOTALL)
                if not json_match:
                    raise parse_err

                json_str = json_match.group(1)
                data = json.loads(json_str)
                schema_keys = ["calendar", "risk", "credit", "events", "portfolio_suggestions", "risk_mitigation_steps"]

                if len(data.keys()) == 1 and list(data.keys())[0] not in schema_keys:
                    data = list(data.values())[0]

                def normalize_calendar(calendar_value: Any) -> Dict[str, Any]:
                    normalized = {"dates": [], "rates": []}
                    if not isinstance(calendar_value, dict):
                        return normalized

                    if isinstance(calendar_value.get("dates"), list):
                        normalized["dates"] = [
                            {
                                "event": item.get("event", "N/A"),
                                "last_date": item.get("last_date", item.get("date", "N/A")),
                                "next_date": item.get("next_date", item.get("date", "N/A")),
                                "consensus": item.get("consensus")
                            }
                            for item in calendar_value.get("dates", [])
                            if isinstance(item, dict)
                        ]

                    if isinstance(calendar_value.get("events"), list) and not normalized["dates"]:
                        normalized["dates"] = [
                            {
                                "event": item.get("event", "N/A"),
                                "last_date": item.get("date", "N/A"),
                                "next_date": item.get("date", "N/A"),
                                "consensus": item.get("consensus")
                            }
                            for item in calendar_value.get("events", [])
                            if isinstance(item, dict)
                        ]

                    if isinstance(calendar_value.get("rates"), list):
                        normalized["rates"] = [
                            {
                                "bank": item.get("bank", "N/A"),
                                "rate": item.get("rate", "N/A"),
                                "guidance": item.get("guidance", "N/A")
                            }
                            for item in calendar_value.get("rates", [])
                            if isinstance(item, dict)
                        ]

                    return normalized

                def normalize_risk(risk_value: Any, sentiment_value: Any = None) -> Dict[str, Any]:
                    normalized = {
                        "score": 5,
                        "summary": "N/A",
                        "contagion_analysis": "N/A",
                        "gold_technical": None,
                        "usd_technical": None,
                        "safe_haven_analysis": None
                    }

                    if isinstance(risk_value, dict):
                        normalized["summary"] = risk_value.get("summary", normalized["summary"])
                        if isinstance(risk_value.get("contagion_analysis"), str):
                            normalized["contagion_analysis"] = risk_value["contagion_analysis"]
                        elif isinstance(risk_value.get("key_risks"), list):
                            normalized["contagion_analysis"] = ", ".join(str(x) for x in risk_value["key_risks"])
                        if isinstance(risk_value.get("score"), int):
                            normalized["score"] = risk_value["score"]
                    if isinstance(sentiment_value, dict):
                        normalized["summary"] = normalized["summary"] if normalized["summary"] != "N/A" else sentiment_value.get("index_overview", normalized["summary"])
                        if isinstance(sentiment_value.get("commodity_focus"), str):
                            normalized["safe_haven_analysis"] = sentiment_value["commodity_focus"]
                    return normalized

                def normalize_credit(credit_value: Any) -> Dict[str, Any]:
                    fallback = {
                        "mid_cap_avg_icr": 0,
                        "sectoral_breakdown": [],
                        "pik_debt_issuance": "N/A",
                        "cre_delinquency_rate": "N/A",
                        "mid_cap_hy_oas": "N/A",
                        "cp_spreads": "N/A",
                        "vix_of_credit_cdx": "N/A",
                        "watchlist": [],
                        "alert": False
                    }
                    if not isinstance(credit_value, dict):
                        return fallback
                    fallback.update({
                        "mid_cap_avg_icr": credit_value.get("mid_cap_avg_icr", fallback["mid_cap_avg_icr"]),
                        "pik_debt_issuance": credit_value.get("pik_debt_issuance", fallback["pik_debt_issuance"]),
                        "cre_delinquency_rate": credit_value.get("cre_delinquency_rate", fallback["cre_delinquency_rate"]),
                        "mid_cap_hy_oas": credit_value.get("mid_cap_hy_oas", fallback["mid_cap_hy_oas"]),
                        "cp_spreads": credit_value.get("cp_spreads", fallback["cp_spreads"]),
                        "vix_of_credit_cdx": credit_value.get("vix_of_credit_cdx", fallback["vix_of_credit_cdx"]),
                        "watchlist": credit_value.get("watchlist", fallback["watchlist"]),
                        "alert": credit_value.get("alert", fallback["alert"])
                    })
                    if isinstance(credit_value.get("sectoral_breakdown"), list):
                        fallback["sectoral_breakdown"] = [item for item in credit_value["sectoral_breakdown"] if isinstance(item, dict)]
                    return fallback

                def normalize_list(value: Any) -> list:
                    if isinstance(value, list):
                        return value
                    return []

                remapped_data = {
                    "calendar": {"dates": [], "rates": []},
                    "risk": {"score": 5, "summary": "N/A", "contagion_analysis": "N/A"},
                    "credit": {"mid_cap_avg_icr": 0, "sectoral_breakdown": [], "pik_debt_issuance": "N/A", "cre_delinquency_rate": "N/A", "mid_cap_hy_oas": "N/A", "cp_spreads": "N/A", "vix_of_credit_cdx": "N/A", "watchlist": [], "alert": False},
                    "events": [],
                    "portfolio_suggestions": [],
                    "risk_mitigation_steps": []
                }

                for key, value in data.items():
                    normalized_key = key.lower()
                    if normalized_key == "calendar":
                        remapped_data["calendar"] = normalize_calendar(value)
                    elif normalized_key in {"risk", "macro_outlook", "outlook", "market_sentiment", "sentiment"}:
                        if normalized_key == "market_sentiment":
                            remapped_data["risk"] = normalize_risk(remapped_data["risk"], value)
                        else:
                            remapped_data["risk"] = normalize_risk(value, data.get("market_sentiment"))
                    elif normalized_key in {"credit", "credit_health"}:
                        remapped_data["credit"] = normalize_credit(value)
                    elif normalized_key in {"events", "market_events", "event_list"}:
                        remapped_data["events"] = normalize_list(value)
                    elif normalized_key in {"portfolio_suggestions", "portfolio", "actionable_strategies", "suggestions"}:
                        remapped_data["portfolio_suggestions"] = normalize_list(value)
                    elif normalized_key in {"risk_mitigation_steps", "mitigation_steps", "actions", "recommendations"}:
                        remapped_data["risk_mitigation_steps"] = normalize_list(value)
                    elif normalized_key == "macro_outlook":
                        remapped_data["risk"] = normalize_risk(value, data.get("market_sentiment"))
                    elif normalized_key == "market_sentiment":
                        remapped_data["risk"] = normalize_risk(remapped_data["risk"], value)

                return {"dashboard_data": MacroDashboardResponse.model_validate(remapped_data)}
            except Exception as repair_err:
                print(f"Repair failed: {str(repair_err)}")
                raise parse_err
            
            raise parse_err

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
