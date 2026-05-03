import logging
from .results import Result

try:
    from backend.autogen_researcher import run_autogen_research
except ImportError:
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
    from backend.autogen_researcher import run_autogen_research

logger = logging.getLogger("ResearcherAdapter")

async def run_research_adapter(provider_name: str) -> Result:
    """
    Wraps the AutoGen research task.
    """
    try:
        summary = await run_autogen_research(provider_name)
        return {
            "success": True,
            "data": summary,
            "confidence": 0.8
        }
    except Exception as e:
        logger.error(f"ResearcherAdapter failure: {e}")
        return {
            "success": False,
            "error": "RESEARCH_FAILURE",
            "message": str(e),
            "confidence": 0.0,
            "recoverable": True
        }
