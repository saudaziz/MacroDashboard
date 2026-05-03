import logging
from typing import Optional
from ..adapters.macro_adapter import generate_dashboard_adapter
from ..adapters.results import Result

logger = logging.getLogger("DashboardRouter")

def route_dashboard_request(provider_name: Optional[str] = None, skip_cache: bool = False) -> Result:
    """
    Pure decision logic for dashboard generation.
    Decides on provider and executes via adapter.
    """
    # 1. Pure decision: Normalize provider
    effective_provider = provider_name or "Bytedance Seed"
    
    # 2. Heuristic: If we are in "high precision" mode, we might want to override.
    # (Simplified for now)
    
    # 3. Execution (I/O) via Adapter
    logger.info(f"Routing request to provider: {effective_provider}")
    result = generate_dashboard_adapter(effective_provider, skip_cache)
    
    # 4. Post-processing decision: If it failed, should we retry with a fallback provider?
    if not result["success"] and result.get("recoverable"):
        logger.warning(f"Primary provider {effective_provider} failed. Attempting fallback to Gemini.")
        fallback_result = generate_dashboard_adapter("Gemini 2.0 Flash", skip_cache)
        return fallback_result
        
    return result
