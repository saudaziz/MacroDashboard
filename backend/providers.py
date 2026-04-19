import os
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from langchain_core.language_models.chat_models import BaseChatModel
from dotenv import load_dotenv

load_dotenv()


def _get_env_var(names: list[str]) -> Tuple[Optional[str], Optional[str]]:
    for name in names:
        value = os.getenv(name)
        if value:
            return value, name
    return None, None


class LLMProvider(ABC):
    @abstractmethod
    def get_model(self) -> BaseChatModel:
        pass

class GeminiProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        # Prioritize picking key directly from the environment
        api_key, key_name = _get_env_var(["GOOGLE_API_KEY", "GEMINI_API_KEY"])
        if not api_key:
            raise ValueError(
                "Neither GOOGLE_API_KEY nor GEMINI_API_KEY is set in your environment. "
                "Please set it using '$env:GOOGLE_API_KEY=\"your_key_here\"' in PowerShell."
            )
        
        # Use a supported Gemini model by default; allow override via environment
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        max_output_tokens = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "1024"))
        
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            max_retries=10,
            timeout=180,
            temperature=0.0,
            max_output_tokens=max_output_tokens,
        )

class ClaudeProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        # Prioritize picking key directly from the environment
        api_key, key_name = _get_env_var(["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"])
        if not api_key:
            raise ValueError(
                "Neither ANTHROPIC_API_KEY nor CLAUDE_API_KEY is set in your environment. "
                "Please set it in your shell environment variables to keep it secure."
            )
        return ChatAnthropic(model_name="claude-3-haiku-20240307", anthropic_api_key=api_key)

class OllamaProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        # Allow overriding via environment variables for remote Ollama instances
        base_url = os.getenv("OLLAMA_BASE_URL", "http://192.168.68.190:11434")
        model_name = os.getenv("OLLAMA_MODEL", "gemma4")

        print(f"DEBUG: Connecting to Ollama at {base_url} with model {model_name}")
        return ChatOllama(base_url=base_url, model=model_name)

from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration

class MockProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        class MockModel(BaseChatModel):
            def _generate(self, messages, stop=None, run_manager=None, **kwargs):
                content = '{"calendar": {"dates": [], "rates": []}, "risk": {"score": 5, "summary": "Mock summary", "contagion_analysis": "None"}, "credit": {"mid_cap_avg_icr": 1.5, "sectoral_breakdown": [], "pik_debt_issuance": "Low", "cre_delinquency_rate": "1%", "mid_cap_hy_oas": "100", "cp_spreads": "10", "vix_of_credit_cdx": "50", "watchlist": [], "alert": false}, "events": [], "portfolio_suggestions": [], "risk_mitigation_steps": []}'
                return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])
            def _llm_type(self): return "mock"
        return MockModel()

def get_provider(provider_name: str) -> LLMProvider:
    if provider_name.lower() == "gemini":
        return GeminiProvider()
    elif provider_name.lower() == "claude":
        return ClaudeProvider()
    elif provider_name.lower() == "ollama":
        return OllamaProvider()
    elif provider_name.lower() == "mock":
        return MockProvider()
    else:
        # Default to Ollama
        return OllamaProvider()
