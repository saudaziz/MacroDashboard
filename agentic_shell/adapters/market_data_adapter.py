import logging
from typing import Optional
from .results import Result

try:
    from backend.fred_tool import FREDClient, fetch_fred_stats
except ImportError:
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
    from backend.fred_tool import FREDClient, fetch_fred_stats

logger = logging.getLogger("MarketDataAdapter")

def get_fred_summary_adapter() -> Result:
    """
    Wraps fetch_fred_stats with error handling and result type.
    """
    try:
        summary = fetch_fred_stats()
        return {
            "success": True,
            "data": summary,
            "confidence": 1.0 if "MOCK" not in summary else 0.5
        }
    except Exception as e:
        logger.error(f"MarketDataAdapter failure: {e}")
        return {
            "success": False,
            "error": "FETCH_FAILURE",
            "message": str(e),
            "confidence": 0.0,
            "recoverable": True
        }

def get_series_latest_adapter(series_id: str) -> Result:
    """
    Wraps get_series_latest with error handling and result type.
    """
    try:
        client = FREDClient()
        val = client.get_series_latest(series_id)
        if val is None:
            return {
                "success": False,
                "error": "NOT_FOUND",
                "message": f"No data found for series {series_id}",
                "confidence": 1.0
            }
        
        # FREDClient already handles fallback to mock, 
        # but we can detect it if we want more granular confidence.
        is_mock = not client.fred
        
        return {
            "success": True,
            "data": val,
            "confidence": 0.95 if not is_mock else 0.5
        }
    except Exception as e:
        return {
            "success": False,
            "error": "UNEXPECTED_ERROR",
            "message": str(e),
            "confidence": 0.0,
            "recoverable": True
        }
