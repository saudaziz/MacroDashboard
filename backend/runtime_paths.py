import os
from pathlib import Path


LOG_ROOT = Path(os.getenv("MACRO_LOG_ROOT", r"C:\Logs\MacroDashboard"))
LOG_ROOT.mkdir(parents=True, exist_ok=True)

APP_LOG_PATH = LOG_ROOT / "backend.log"

CACHE_DIR = LOG_ROOT / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

LATEST_DASHBOARD_PATH = LOG_ROOT / "latest_dashboard.json"
