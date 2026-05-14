import asyncio
import logging
from typing import List, Dict, Any, Optional
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_core.models import UserMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from backend.autogen_config import get_autogen_config
from langchain_community.tools import DuckDuckGoSearchRun
from datetime import datetime, timezone

logger = logging.getLogger("AutoGenResearcher")

async def run_autogen_research(provider_name: str, yield_callback=None) -> str:
    """
    Runs a two-agent AutoGen (0.10.x) team to perform deep macro research.
    """
    config_list = get_autogen_config(provider_name)
    if not config_list:
        return "No configuration found for provider. Falling back to internal knowledge."

    # Map the first config to the OpenAIChatCompletionClient
    cfg = config_list[0]
    
    # AutoGen 0.10 requires a model client
    model_client = OpenAIChatCompletionClient(
        model=cfg["model"],
        api_key=cfg["api_key"],
        base_url=cfg.get("base_url"),
        model_info={
            "vision": False,
            "function_calling": True,
            "json_output": False,
            "family": "unknown"
        }
    )

    search_tool = DuckDuckGoSearchRun()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Define tool for AutoGen
    async def search_func(query: str) -> str:
        if yield_callback:
            await yield_callback({
                "status": "agent_step",
                "agent": "Lead_Researcher",
                "message": f"Searching for: {query}"
            })
        result = await asyncio.to_thread(search_tool.run, query)
        if yield_callback:
            await yield_callback({
                "status": "agent_message",
                "agent": "Lead_Researcher",
                "message": f"Found data for: {query}"
            })
        return result

    lead_researcher = AssistantAgent(
        name="Lead_Researcher",
        model_client=model_client,
        tools=[search_func],
        system_message=(
            "You are a Lead Macro Researcher. Use the search tool to find CURRENT market data for 2026. "
            "Focus on gold prices, crude oil, central bank guidance, and credit spreads. "
            "Be exhaustive and provide specific numbers."
        )
    )

    verification_analyst = AssistantAgent(
        name="Verification_Analyst",
        model_client=model_client,
        system_message=(
            "You are a Verification Analyst. Review findings from the Lead Researcher. "
            "Ensure the data is relevant for the year 2026. If data is stale or missing, ask for clarification. "
            "Provide a final synthesized summary of all valid macro points."
        )
    )

    team = RoundRobinGroupChat([lead_researcher, verification_analyst], max_turns=3)

    prompt = f"Conduct deep research on macroeconomic conditions as of {today_str}. Focus on gold, oil, G7 rates, and mid-cap credit health."

    full_research = ""
    try:
        # Run the team and stream messages
        async for event in team.run_stream(task=prompt):
            # Capture content from the assistant agents
            if hasattr(event, 'content') and event.source in ["Lead_Researcher", "Verification_Analyst"]:
                content = event.content
                full_research += f"\n\n### {event.source}\n{content}"
                if yield_callback:
                    # Map AutoGen sources to meaningful status updates
                    await yield_callback({
                        "status": "agent_step",
                        "agent": event.source,
                        "message": "Synthesizing findings..." if event.source == "Lead_Researcher" else "Verifying data recency..."
                    })
                    await yield_callback({
                        "status": "agent_message",
                        "agent": event.source,
                        "message": content
                    })
    except Exception as exc:
        logger.error("AutoGen team error: %s", exc)
        return f"Research failed due to AutoGen error: {exc}"

    return full_research if full_research else "No specific web data found by AutoGen team."
