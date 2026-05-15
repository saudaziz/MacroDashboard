import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

_ENV_LOADED = False

def _load_env_once() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    # Backend root is src/backend; keep lookup deterministic.
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    _ENV_LOADED = True

def get_env_variable(key: str, default: Optional[str] = None) -> str:
    """
    Retrieves an environment variable, prioritizing system environment variables
    over those defined in a .env file.
    """
    _load_env_once()
    
    value = os.environ.get(key, default)
    if value is None:
        raise EnvironmentError(f"Environment variable '{key}' is not set.")
    return value
