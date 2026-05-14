import os
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

def get_autogen_config(provider_name: str) -> List[Dict[str, Any]]:
    """
    Dynamically generates AutoGen llm_config from environment variables.
    This ensures keys are never hardcoded or checked into source control.
    """
    provider_name = provider_name.lower()
    
    # Base URL for NVIDIA-hosted models
    nvidia_base_url = "https://integrate.api.nvidia.com/v1"
    
    config_list = []
    
    if "gemini" in provider_name:
        api_key = os.getenv("GOOGLE_API_KEY")
        if api_key:
            config_list.append({
                "model": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
                "api_key": api_key,
                "api_type": "google",
            })
            
    elif "claude" in provider_name:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            config_list.append({
                "model": os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307"),
                "api_key": api_key,
                "api_type": "anthropic",
            })

    elif "qwen" in provider_name:
        api_key = os.getenv("QWEN_API_KEY") or os.getenv("NVIDIA_API_KEY")
        if api_key:
            config_list.append({
                "model": os.getenv("QWEN_MODEL", "qwen/qwen3.5-397b-a17b"),
                "api_key": api_key,
                "base_url": nvidia_base_url,
            })

    elif "bytedance" in provider_name or "seed" in provider_name:
        api_key = os.getenv("BYTEDANCE_API_KEY") or os.getenv("NVIDIA_API_KEY")
        if api_key:
            config_list.append({
                "model": os.getenv("BYTEDANCE_MODEL", "bytedance/seed-oss-36b-instruct"),
                "api_key": api_key,
                "base_url": nvidia_base_url,
            })

    elif "deepseek" in provider_name:
        api_key = os.getenv("DEEPSEEK_API_KEY") or os.getenv("NVIDIA_API_KEY")
        if api_key:
            config_list.append({
                "model": os.getenv("DEEPSEEK_MODEL", "deepseek-ai/deepseek-v3.2"),
                "api_key": api_key,
                "base_url": nvidia_base_url,
            })

    elif "ollama" in provider_name:
        config_list.append({
            "model": os.getenv("OLLAMA_MODEL", "gemma4"),
            "base_url": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            "api_type": "ollama",
        })

    return config_list
