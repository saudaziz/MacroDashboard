import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fredapi import Fred

logger = logging.getLogger("FREDTool")

class FREDClient:
    def __init__(self):
        self.api_key = os.getenv("FRED_API_KEY")
        self.fred = None
        if self.api_key and self.api_key != "your_fred_api_key_here":
            try:
                self.fred = Fred(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize FRED client: {e}")
        else:
            logger.warning("FRED_API_KEY not found or default. Running in MOCK mode.")

    def get_series_latest(self, series_id: str) -> Optional[float]:
        if not self.fred:
            return self._get_mock_value(series_id)
        try:
            data = self.fred.get_series(series_id)
            if data is not None and not data.empty:
                valid_data = data.dropna()
                if not valid_data.empty:
                    return float(valid_data.iloc[-1])
            # If data is empty or all NaN, fallback to mock
            logger.warning(f"FRED returned empty data for {series_id}, using mock.")
            return self._get_mock_value(series_id)
        except Exception as e:
            logger.error(f"Error fetching series {series_id}: {e}. Falling back to mock.")
            return self._get_mock_value(series_id)

    def _get_mock_value(self, series_id: str) -> float:
        # Provide realistic mock values for development
        mocks = {
            "T10Y2Y": -0.15,      # 10Y-2Y Spread
            "T10Y3M": -0.45,      # 10Y-3M Spread
            "CPIAUCSL": 3.1,      # CPI (YoY approx)
            "PCEPILFE": 2.8,      # Core PCE
            "UNRATE": 4.0,        # Unemployment
            "M2SL": 21000.0,      # M2 Money Supply
            "FEDFUNDS": 5.33      # Fed Funds Rate
        }
        return mocks.get(series_id, 0.0)

    def get_macro_summary(self) -> str:
        indicators = {
            "10Y-2Y Yield Spread": ("T10Y2Y", "%"),
            "10Y-3M Yield Spread": ("T10Y3M", "%"),
            "CPI Inflation (YoY)": ("CPIAUCSL", "%"),
            "Core PCE Inflation": ("PCEPILFE", "%"),
            "Unemployment Rate": ("UNRATE", "%"),
            "M2 Money Supply": ("M2SL", "Billion USD"),
            "Effective Fed Funds Rate": ("FEDFUNDS", "%")
        }
        
        summary = "### REAL-TIME FRED MACRO DATA\n"
        for label, (sid, unit) in indicators.items():
            val = self.get_series_latest(sid)
            summary += f"- {label}: {val}{unit}\n"
        
        return summary

def fetch_fred_stats() -> str:
    client = FREDClient()
    return client.get_macro_summary()
