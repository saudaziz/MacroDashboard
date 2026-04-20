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
            await yield_callback(f"Searching: {query}")
        return await asyncio.to_thread(search_tool.run, query)

    # 1. The Lead Researcher
    researcher = AssistantAgent(
        name="Lead_Researcher",
        model_client=model_client,
        tools=[search_func],
        system_message=(
            f"You are a Senior Macro Researcher. Today is {today_str}. "
            "Your goal is to find the most recent gold prices, crude oil prices, CPI/PPI dates, "
            "and mid-cap credit metrics for 2026. "
            "Use your search tool to find CURRENT data. If you find data from 2024 or 2025, "
            "keep looking for 2026 updates."
        )
    )

    # 2. The Verification Analyst
    analyst = AssistantAgent(
        name="Verification_Analyst",
        model_client=model_client,
        system_message=(
            "You are a Quality Control Analyst. You review the findings of the Lead_Researcher. "
            f"Ensure all data is valid for {today_str} or the year 2026. "
            "If the researcher provides old data (e.g. from 2025), tell them to search again for 2026. "
            "Once the data is verified and complete, provide a final consolidated summary."
        )
    )

    # 3. Create the team
    team = RoundRobinGroupChat(
        [researcher, analyst],
        max_turns=6
    )

    # Start the conversation
    prompt = (
        f"Perform a deep search for current macro indicators as of {today_str}. "
        "I need: 1. Current Gold and Oil prices. 2. Latest 2026 CPI/PPI/Jobs release dates. "
        "3. Current G7 Central Bank rates. 4. Mid-cap ICR and delinquency trends for 2026."
    )

    full_research = ""
    try:
        # Run the team and stream messages
        async for event in team.run_stream(task=prompt):
            # Capture content from the assistant agents
            if hasattr(event, 'content') and event.source in ["Lead_Researcher", "Verification_Analyst"]:
                content = event.content
                full_research += f"\n\n### {event.source}\n{content}"
                if yield_callback:
                    await yield_callback(f"{event.source} shared findings...")
    except Exception as exc:
        logger.error("AutoGen team error: %s", exc)
        return f"Research failed due to AutoGen error: {exc}"

    return full_research if full_research else "No specific web data found by AutoGen team."
