import logging
from typing import Optional, Any
from .results import Result

try:
    from backend.agent import generate_macro_dashboard, stream_macro_dashboard
except ImportError:
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
    from backend.agent import generate_macro_dashboard, stream_macro_dashboard

logger = logging.getLogger("MacroAdapter")

def generate_dashboard_adapter(provider_name: str, skip_cache: bool = False) -> Result:
    """
    Wraps the main dashboard generation logic.
    """
    try:
        response = generate_macro_dashboard(provider_name, skip_cache)
        # response is a MacroDashboardResponse object (pydantic model)
        return {
            "success": True,
            "data": response.dict() if hasattr(response, 'dict') else response,
            "confidence": 0.9  # Initial heuristic
        }
    except Exception as e:
        logger.error(f"MacroAdapter generation failure: {e}")
        return {
            "success": False,
            "error": "ORCHESTRATION_FAILURE",
            "message": str(e),
            "confidence": 0.0,
            "recoverable": True
        }

async def stream_dashboard_adapter(provider_name: str, skip_cache: bool = False):
    """
    Wraps the streaming dashboard generation.
    Note: Results in streams are usually handled per-chunk, 
    but for this shell we wrap the generator creation.
    """
    try:
        return stream_macro_dashboard(provider_name, skip_cache)
    except Exception as e:
        logger.error(f"MacroAdapter streaming failure: {e}")
        # For an async generator, we might need a more complex error yield if we want to follow Result pattern strictly.
        raise e
