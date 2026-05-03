import asyncio
import logging
import sys
import os

# Ensure we can import from the root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from agentic_shell.routers.dashboard_router import route_dashboard_request
from agentic_shell.state.dashboard_state import DashboardState
from agentic_shell.adapters.market_data_adapter import get_fred_summary_adapter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ShellTest")

async def test_dashboard_flow():
    logger.info("Starting Dashboard Flow Test via Agentic Shell")
    
    # 1. Initialize State
    state = DashboardState(provider="Mock Terminal")
    logger.info(f"Initial State: {state.to_dict()}")
    
    # 2. Transition to START
    state = state.transition("START")
    logger.info(f"State after START: {state.to_dict()}")
    
    # 3. Route request (which calls adapter)
    # Using Mock provider to ensure it works without API keys
    result = route_dashboard_request(provider_name="Mock Terminal", skip_cache=True)
    
    # 4. Handle Result and Update State
    if result["success"]:
        state = state.transition("SUCCESS", payload={"data": result["data"]})
        logger.info("Dashboard generated successfully via shell.")
    else:
        state = state.transition("FAILURE", payload={"error": result["error"]})
        logger.error(f"Dashboard generation failed: {result['error']}")
        
    logger.info(f"Final State: {state.to_dict()}")

def test_market_data():
    logger.info("Testing Market Data Adapter")
    result = get_fred_summary_adapter()
    logger.info(f"Market Data Result: {result}")

if __name__ == "__main__":
    test_market_data()
    asyncio.run(test_dashboard_flow())
