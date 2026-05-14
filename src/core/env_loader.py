import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

def get_env_variable(key: str, default: Optional[str] = None) -> str:
    """
    Retrieves an environment variable, prioritizing system environment variables
    over those defined in a .env file.
    """
    # Try to load .env file from the backend directory if it exists
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    
    value = os.environ.get(key, default)
    if value is None:
        raise EnvironmentError(f"Environment variable '{key}' is not set.")
    return value
