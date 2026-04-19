import json
import re
from typing import List, Dict, Any, TypedDict, Annotated, AsyncGenerator
import operator
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


def _estimate_tokens(text: str) -> int:
    return max(0, len(re.findall(r"\S+", text)))


def _build_llm_request(provider_name: str, aggregated_research: str) -> str:
    system_prompt = """
    You are a professional Macro-Economic Analyst. Your task is to provide a comprehensive daily dashboard.
    
    RESEARCH DATA:
    {research_data}
    
    ### CRITICAL OUTPUT FORMAT REQUIREMENTS ###
    You MUST return ONLY a raw JSON object with NO wrapper keys.
    The JSON must have exactly these top-level keys: "calendar", "risk", "credit", "events", "portfolio_suggestions", "risk_mitigation_steps".
    Do NOT use keys like "market_overview", "macro_outlook", "credit_risk_assessment", "recommended_strategy", or any other wrapper.
    Each key must contain the appropriate data as specified below.

    ### REQUIRED JSON STRUCTURE ###
    {{
        "calendar": {{
            "dates": [array of economic event dates with last_date, next_date, consensus],
            "rates": [array of central bank rates with bank, rate, guidance]
        }},
        "risk": {{
            "score": integer 1-10,
            "summary": "string summary of risk sentiment",
            "contagion_analysis": "string analysis of crypto/equity/gold contagion",
            "gold_technical": "string or null",
            "usd_technical": "string or null"
        }},
        "credit": {{
            "mid_cap_avg_icr": number,
            "sectoral_breakdown": array,
            "pik_debt_issuance": "string",
            "cre_delinquency_rate": "string",
            "mid_cap_hy_oas": "string",
            "cp_spreads": "string",
            "vix_of_credit_cdx": "string",
            "watchlist": array,
            "alert": boolean
        }},
        "events": array of market/legal events,
        "portfolio_suggestions": array of actionable allocation suggestions,
        "risk_mitigation_steps": array of mitigation recommendations
    }}

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

    Return ONLY the JSON object. No text before or after.
    """
    research_limit = 6000 if provider_name.lower() == "gemini" else 10000
    optimized_research = aggregated_research[:research_limit]
    if len(aggregated_research) > research_limit:
        optimized_research += "\n\n[Note: Research data truncated for token optimization...]"

    if provider_name.lower() != "ollama":
        return system_prompt.replace("{research_data}", optimized_research)

    parser = PydanticOutputParser(pydantic_object=MacroDashboardResponse)
    format_instructions = parser.get_format_instructions()
    safe_instructions = format_instructions.replace("{", "{{").replace("}", "}}")
    full_prompt = system_prompt + f"\n\nJSON SCHEMA AND FORMAT INSTRUCTIONS:\n{safe_instructions}\n\nREMEMBER: Return ONLY the JSON. No wrappers."
    return full_prompt.replace("{research_data}", optimized_research)


def build_request_node(state: AgentState) -> Dict[str, Any]:
    request_text = _build_llm_request(state["provider_name"], state["aggregated_research"])
    return {
        "llm_request": request_text,
        "request_tokens": _estimate_tokens(request_text)
    }


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
    
    ### CRITICAL OUTPUT FORMAT REQUIREMENTS ###
    You MUST return ONLY a raw JSON object with NO wrapper keys.
    The JSON must have exactly these top-level keys: "calendar", "risk", "credit", "events", "portfolio_suggestions", "risk_mitigation_steps".
    Do NOT use keys like "market_overview", "macro_outlook", "credit_risk_assessment", "recommended_strategy", or any other wrapper.
    Each key must contain the appropriate data as specified below.

    ### REQUIRED JSON STRUCTURE ###
    {{
        "calendar": {{
            "dates": [array of economic event dates with last_date, next_date, consensus],
            "rates": [array of central bank rates with bank, rate, guidance]
        }},
        "risk": {{
            "score": integer 1-10,
            "summary": "string summary of risk sentiment",
            "contagion_analysis": "string analysis of crypto/equity/gold contagion",
            "gold_technical": "string or null",
            "usd_technical": "string or null"
        }},
        "credit": {{
            "mid_cap_avg_icr": number,
            "sectoral_breakdown": array,
            "pik_debt_issuance": "string",
            "cre_delinquency_rate": "string",
            "mid_cap_hy_oas": "string",
            "cp_spreads": "string",
            "vix_of_credit_cdx": "string",
            "watchlist": array,
            "alert": boolean
        }},
        "events": array of market/legal events,
        "portfolio_suggestions": array of actionable allocation suggestions,
        "risk_mitigation_steps": array of mitigation recommendations
    }}

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

    Return ONLY the JSON object. No text before or after.
    """

    # Truncate research data to optimize prompt density and stay within token limits
    research_limit = 6000 if state["provider_name"].lower() == "gemini" else 10000
    optimized_research = state["aggregated_research"][:research_limit]
    if len(state["aggregated_research"]) > research_limit:
        optimized_research += "\n\n[Note: Research data truncated for token optimization...]"

    def _invoke_chain(chain, research_text):
        return chain.invoke({"research_data": research_text})

    def _estimate_tokens(text: str) -> int:
        return max(0, len(re.findall(r"\S+", text)))

def _extract_token_stats(raw_obj: Any, request_text: str | None = None) -> Dict[str, Any]:
    stats = {"request_tokens": None, "response_tokens": None, "total_tokens": None}
    if request_text:
        stats["request_tokens"] = _estimate_tokens(request_text)

    if hasattr(raw_obj, "llm_output") and isinstance(getattr(raw_obj, "llm_output"), dict):
        usage = raw_obj.llm_output
        stats["response_tokens"] = usage.get("completion_tokens") or usage.get("output_tokens") or usage.get("response_tokens") or usage.get("total_tokens")
        if stats["request_tokens"] is None:
            stats["request_tokens"] = usage.get("prompt_tokens")
    elif isinstance(raw_obj, dict):
        usage = raw_obj.get("usage") or raw_obj.get("token_usage")
        if isinstance(usage, dict):
            stats["response_tokens"] = usage.get("completion_tokens") or usage.get("output_tokens") or usage.get("response_tokens") or usage.get("total_tokens")
            if stats["request_tokens"] is None:
                stats["request_tokens"] = usage.get("prompt_tokens")
    elif isinstance(raw_obj, str):
        stats["response_tokens"] = _estimate_tokens(raw_obj)
    elif hasattr(raw_obj, "usage") and isinstance(raw_obj.usage, dict):
        # For some models, usage is a direct attribute
        usage = raw_obj.usage
        stats["response_tokens"] = usage.get("completion_tokens") or usage.get("output_tokens") or usage.get("response_tokens") or usage.get("total_tokens")
        if stats["request_tokens"] is None:
            stats["request_tokens"] = usage.get("prompt_tokens")

    if stats["request_tokens"] is not None and stats["response_tokens"] is not None:
        stats["total_tokens"] = stats["request_tokens"] + stats["response_tokens"]
    return stats

    def _build_llm_request(state: AgentState) -> str:
        provider_name = state["provider_name"]
        research_limit = 6000 if provider_name.lower() == "gemini" else 10000
        optimized_research = state["aggregated_research"][:research_limit]
        if len(state["aggregated_research"]) > research_limit:
            optimized_research += "\n\n[Note: Research data truncated for token optimization...]"

        if provider_name.lower() != "ollama":
            return system_prompt.replace("{research_data}", optimized_research)

        parser = PydanticOutputParser(pydantic_object=MacroDashboardResponse)
        format_instructions = parser.get_format_instructions()
        safe_instructions = format_instructions.replace("{", "{{").replace("}", "}}")
        full_prompt = system_prompt + f"\n\nJSON SCHEMA AND FORMAT INSTRUCTIONS:\n{safe_instructions}\n\nREMEMBER: Return ONLY the JSON. No wrappers."
        return full_prompt.replace("{research_data}", optimized_research)

    request_prompt_text = state.get("llm_request") or _build_llm_request(state)
    request_token_count = state.get("request_tokens") or _estimate_tokens(request_prompt_text)
    prompt = ChatPromptTemplate.from_template(system_prompt)
    if state.get("llm_request") is None and state["provider_name"].lower() != "ollama":
        request_prompt_text = system_prompt.replace("{research_data}", optimized_research)
        # Structured output usually works great for Claude/Gemini
        chain = prompt | structured_model
        try:
            response = _invoke_chain(chain, optimized_research)
            return {
                "dashboard_data": response,
                "raw_response": str(response),
                "llm_request": f"Model: {getattr(model, 'model_name', getattr(model, 'model', 'unknown'))}\n\n{request_prompt_text}",
                "token_stats": _extract_token_stats(response, request_prompt_text)
            }
        except Exception as exc:
            error_text = str(exc).lower()
            if state["provider_name"].lower() == "gemini" and any(term in error_text for term in ["exhaust", "context length", "max tokens", "token limit"]):
                print("DEBUG: Gemini exhaustion detected during structured output. Retrying with a smaller research payload...")
                smaller_research = state["aggregated_research"][:4000]
                response = _invoke_chain(chain, smaller_research)
                return {"dashboard_data": response}
            raise
    else:
        # For Ollama or as fallback, use the parser with very explicit instructions
        parser = PydanticOutputParser(pydantic_object=MacroDashboardResponse)
        format_instructions = parser.get_format_instructions()
        safe_instructions = format_instructions.replace("{", "{{").replace("}", "}}")
        full_prompt = system_prompt + f"\n\nJSON SCHEMA AND FORMAT INSTRUCTIONS:\n{safe_instructions}\n\nREMEMBER: Return ONLY the JSON. No wrappers."
        
        prompt = ChatPromptTemplate.from_template(full_prompt)
        chain = prompt | model
        request_prompt_text = full_prompt.replace("{research_data}", optimized_research)
        
        try:
            raw_response = _invoke_chain(chain, optimized_research)
        except Exception as exc:
            error_text = str(exc).lower()
            if state["provider_name"].lower() == "gemini" and any(term in error_text for term in ["exhaust", "context length", "max tokens", "token limit"]):
                print("DEBUG: Gemini exhaustion detected during fallback output. Retrying with a smaller research payload...")
                raw_response = _invoke_chain(chain, state["aggregated_research"][:4000])
            else:
                raise

        content = raw_response.content if hasattr(raw_response, 'content') else str(raw_response)

        try:
            # 1. Try standard parser
            return {
                "dashboard_data": parser.parse(content),
                "raw_response": content,
                "llm_request": request_prompt_text,
                "token_stats": _extract_token_stats(raw_response, request_prompt_text)
            }
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
                    elif normalized_key in {"risk", "macro_outlook", "outlook", "market_sentiment", "sentiment", "market_overview"}:
                        if normalized_key == "market_sentiment":
                            remapped_data["risk"] = normalize_risk(remapped_data["risk"], value)
                        elif normalized_key == "market_overview":
                            # Map market_overview to risk summary
                            risk_dict = {"summary": value} if isinstance(value, str) else value
                            remapped_data["risk"] = normalize_risk(risk_dict, data.get("market_sentiment"))
                        else:
                            remapped_data["risk"] = normalize_risk(value, data.get("market_sentiment"))
                    elif normalized_key in {"credit", "credit_health", "credit_risk_assessment"}:
                        if normalized_key == "credit_risk_assessment":
                            # Map credit_risk_assessment to credit
                            credit_dict = value if isinstance(value, dict) else {"summary": value}
                            remapped_data["credit"] = normalize_credit(credit_dict)
                        else:
                            remapped_data["credit"] = normalize_credit(value)
                    elif normalized_key in {"events", "market_events", "event_list"}:
                        remapped_data["events"] = normalize_list(value)
                    elif normalized_key in {"portfolio_suggestions", "portfolio", "actionable_strategies", "suggestions", "recommended_strategy"}:
                        if normalized_key == "recommended_strategy":
                            # Map recommended_strategy to portfolio_suggestions
                            suggestions = [value] if isinstance(value, str) else normalize_list(value)
                            remapped_data["portfolio_suggestions"] = suggestions
                        else:
                            remapped_data["portfolio_suggestions"] = normalize_list(value)
                    elif normalized_key in {"risk_mitigation_steps", "mitigation_steps", "actions", "recommendations"}:
                        remapped_data["risk_mitigation_steps"] = normalize_list(value)
                    elif normalized_key == "macro_outlook":
                        remapped_data["risk"] = normalize_risk(value, data.get("market_sentiment"))
                    elif normalized_key == "market_sentiment":
                        remapped_data["risk"] = normalize_risk(remapped_data["risk"], value)

                return {
                    "dashboard_data": MacroDashboardResponse.model_validate(remapped_data),
                    "raw_response": content,
                    "llm_request": request_prompt_text,
                    "token_stats": _extract_token_stats(content, request_prompt_text)
                }
            except Exception as repair_err:
                print(f"Repair failed: {str(repair_err)}")
                raise parse_err

def create_agent_graph():
    """Creates the LangGraph state machine."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("researcher", research_node)
    workflow.add_node("request_builder", build_request_node)
    workflow.add_node("analyst", analyze_node)
    
    # Define edges
    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "request_builder")
    workflow.add_edge("request_builder", "analyst")
    workflow.add_edge("analyst", END)
    
    return workflow.compile()

CACHE_DIR = Path(__file__).resolve().parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
LATEST_CACHE_PATH = Path(__file__).resolve().parent / "latest_dashboard.json"


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


def _load_latest_dashboard() -> dict | None:
    if not LATEST_CACHE_PATH.exists():
        return None

    try:
        cached = json.loads(LATEST_CACHE_PATH.read_text(encoding="utf-8"))
        return cached
    except Exception as exc:
        print(f"Failed to load latest dashboard cache {LATEST_CACHE_PATH}: {exc}")
        return None


def _save_latest_dashboard(provider_name: str, dashboard_data: Any, raw_response: str, llm_request: str | None = None, token_stats: dict | None = None) -> None:
    try:
        payload = {
            "provider": provider_name,
            "timestamp": time.time(),
            "dashboard_data": dashboard_data,
            "raw_response": raw_response,
        }
        if llm_request is not None:
            payload["llm_request"] = llm_request
        if token_stats is not None:
            payload["token_stats"] = token_stats
        LATEST_CACHE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except Exception as exc:
        print(f"Failed to save latest dashboard cache {LATEST_CACHE_PATH}: {exc}")


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
        if llm_request is not None:
            payload["llm_request"] = llm_request
        if token_stats is not None:
            payload["token_stats"] = token_stats
        path.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )
    except Exception as exc:
        print(f"Failed to save daily cache {path}: {exc}")

# Global agent instance
macro_agent = create_agent_graph()

def generate_macro_dashboard(provider_name: str) -> MacroDashboardResponse:
    """Entry point for the macro dashboard generation."""
    cached = _load_daily_cache(provider_name)
    if cached:
        _save_latest_dashboard(
            provider_name,
            cached["dashboard_data"],
            cached.get("raw_response", ""),
            cached.get("llm_request"),
            cached.get("token_stats"),
        )
        return MacroDashboardResponse.model_validate(cached["dashboard_data"])
    
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

import time
import asyncio

# Global cache and lock to prevent rate limit spam
_dashboard_cache = {} # {provider_name: {"data": ..., "timestamp": float}}
_cache_expiry = 300 # 5 minutes
_research_lock = asyncio.Lock()

async def stream_macro_dashboard(provider_name: str) -> AsyncGenerator[str, None]:
    """Asynchronous generator to stream research progress."""
    
    # 1. Check in-memory cache
    now = time.time()
    if provider_name in _dashboard_cache:
        cached = _dashboard_cache[provider_name]
        if now - cached["timestamp"] < _cache_expiry:
            yield json.dumps({"status": "research_start", "message": "Serving from in-memory cache (updates every 5 mins)..."})
            yield json.dumps({"status": "analysis_complete", "data": cached["data"], "raw_response": cached.get("raw_response")})
            return

    # 2. Check daily file cache
    daily_cached = _load_daily_cache(provider_name)
    if daily_cached:
        yield json.dumps({"status": "research_start", "message": "Serving from daily cache file"})
        yield json.dumps({
            "status": "analysis_complete",
            "data": daily_cached["dashboard_data"],
            "raw_response": daily_cached.get("raw_response"),
            "llm_request": daily_cached.get("llm_request"),
            "token_stats": daily_cached.get("token_stats")
        })
        return

    # 3. Prevent concurrent research to protect rate limits
    async with _research_lock:
        # Re-check cache inside lock in case another request filled it
        if provider_name in _dashboard_cache and now - _dashboard_cache[provider_name]["timestamp"] < _cache_expiry:
             yield json.dumps({"status": "analysis_complete", "data": _dashboard_cache[provider_name]["data"]})
             return

        initial_state: AgentState = {
            "provider_name": provider_name,
            "search_queries": [
                "latest macro economic dates CPI PPI Jobs Retail Sales FED BOJ BOE ECB next dates 2026",
                "current G7 central bank interest rates and guidance crypto equity gold contagion 2026",
                "current VIX 10Y yields mid-cap HY OAS CP spreads credit CDX stress 2026",
                "mid-cap ICR average top high-debt firms and major legal market events today 2026"
            ],
            "aggregated_research": "",
            "dashboard_data": None
        }
        
        # Send initial status
        yield json.dumps({"status": "research_start", "message": "Agent is initiating research..."})
        
        # Use astream for asynchronous streaming
        async for output in macro_agent.astream(initial_state):
            # output is a dict where keys are node names
            if not isinstance(output, dict):
                print(f"DEBUG: Received invalid stream output type: {type(output).__name__}")
                continue

            for node_name, state_update in output.items():
                if state_update is None or not isinstance(state_update, dict):
                    print(f"DEBUG: Received invalid state_update for node {node_name}: {type(state_update).__name__}")
                    continue
                if node_name == "researcher":
                    yield json.dumps({"status": "research_complete", "message": "Web search research phase finished."})
                    yield json.dumps({"status": "analysis_start", "message": "Analyst is processing gathered data..."})
                elif node_name == "request_builder":
                    request_text = state_update.get("llm_request") or ""
                    request_tokens = state_update.get("request_tokens")
                    yield json.dumps({
                        "status": "llm_request_ready",
                        "message": "LLM request built and ready.",
                        "llm_request": request_text,
                        "token_stats": {
                            "request_tokens": request_tokens
                        }
                    })
                elif node_name == "analyst":
                    if "dashboard_data" not in state_update:
                        print(f"DEBUG: Analyst returned partial update without dashboard_data: {state_update}")
                        continue

                    dashboard_obj = state_update["dashboard_data"]
                    dashboard_json = dashboard_obj.model_dump() if hasattr(dashboard_obj, "model_dump") else dashboard_obj
                    raw_response_text = state_update.get("raw_response", "")
                    llm_request_text = state_update.get("llm_request")
                    token_stats = state_update.get("token_stats")
                    # Update cache
                    _dashboard_cache[provider_name] = {
                        "data": dashboard_json,
                        "timestamp": time.time(),
                        "raw_response": raw_response_text,
                        "llm_request": llm_request_text,
                        "token_stats": token_stats,
                    }
                    _save_daily_cache(provider_name, dashboard_json, raw_response_text, llm_request_text, token_stats)
                    _save_latest_dashboard(provider_name, dashboard_json, raw_response_text, llm_request_text, token_stats)
                    yield json.dumps({
                        "status": "analysis_complete",
                        "data": dashboard_json,
                        "raw_response": raw_response_text,
                        "llm_request": llm_request_text,
                        "token_stats": token_stats,
                    })
