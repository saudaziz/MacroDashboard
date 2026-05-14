import os
import logging
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from langchain_core.language_models.chat_models import BaseChatModel
from backend.env_loader import get_env_variable

try:
    from langchain_ollama import ChatOllama
except ImportError:
    ChatOllama = None

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None

logger = logging.getLogger("Providers")


_PROVIDER_REGISTRY = {
    "openrouter": "OpenRouter",
    "ollama": "Ollama Gemma",
    "mock": "Mock Terminal",
    "demo": "Demo",
}

try:
    _DEFAULT_PROVIDER = get_env_variable("DEFAULT_PROVIDER", "openrouter")
except EnvironmentError:
    _DEFAULT_PROVIDER = "openrouter"


def _require_dependency(dependency: object, package_name: str) -> None:
    if dependency is None:
        raise ImportError(
            f"Missing optional dependency '{package_name}'. "
            f"Install it with: pip install {package_name}"
        )


class LLMProvider(ABC):
    @abstractmethod
    def get_model(self) -> BaseChatModel:
        pass


class OpenRouterProvider(LLMProvider):
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or get_env_variable("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")

    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOpenAI, "langchain-openai")
        logger.info(f"Initializing OpenRouterProvider with model: {self.model_name}")
        api_key = get_env_variable("OPENROUTER_API_KEY")

        return ChatOpenAI(
            model=self.model_name,
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )


class OllamaProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOllama, "langchain-ollama")
        base_url = get_env_variable("OLLAMA_BASE_URL", "http://192.168.68.190:11434")
        model_name = get_env_variable("OLLAMA_MODEL", "gemma4")
        logger.info(f"Initializing Ollama Provider at {base_url} with model {model_name}...")
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

def list_supported_providers(include_mock: bool = False) -> list[str]:
    providers = ["OpenRouter", "Ollama Gemma", "Demo"]
    if include_mock:
        providers.append("Mock Terminal")
    return providers


def get_default_provider_name() -> str:
    default_key = (_DEFAULT_PROVIDER or "").strip().lower()
    if default_key in _PROVIDER_REGISTRY:
        return _PROVIDER_REGISTRY[default_key]
    return "OpenRouter"


def normalize_provider_name(provider_name: Optional[str]) -> str:
    candidate = (provider_name or "").strip()
    if not candidate:
        return get_default_provider_name()

    for val in _PROVIDER_REGISTRY.values():
        if candidate.lower() == val.lower():
            return val

    key = candidate.lower()
    if key in _PROVIDER_REGISTRY:
        return _PROVIDER_REGISTRY[key]
        
    # Maps all legacy providers to OpenRouter
    legacy_keys = ["gemini", "claude", "qwen", "bytedance", "deepseek"]
    if any(k in key for k in legacy_keys) or "openrouter" in key:
        return _PROVIDER_REGISTRY["openrouter"]
        
    if "ollama" in key:
        return _PROVIDER_REGISTRY["ollama"]
    if "mock" in key:
        return _PROVIDER_REGISTRY["mock"]

    valid = ", ".join(list_supported_providers(include_mock=True))
    raise ValueError(f"Unsupported provider '{provider_name}'. Supported providers: {valid}")


def get_provider(provider_name: Optional[str]) -> LLMProvider:
    canonical_name = normalize_provider_name(provider_name)
    logger.info(f"Fetching provider: {canonical_name}")
    
    rev_registry = {v.lower(): k for k, v in _PROVIDER_REGISTRY.items()}
    provider_key = rev_registry.get(canonical_name.lower())

    if provider_key == "openrouter":
        return OpenRouterProvider()
    if provider_key == "ollama":
        return OllamaProvider()
    if provider_key == "mock":
        return MockProvider()
    raise ValueError(f"Provider registry mismatch for '{canonical_name}'.")
