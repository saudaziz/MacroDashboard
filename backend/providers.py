import os
import logging
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from langchain_core.language_models.chat_models import BaseChatModel

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

try:
    from langchain_ollama import ChatOllama
except ImportError:
    ChatOllama = None

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA
except ImportError:
    ChatNVIDIA = None

try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None

logger = logging.getLogger("Providers")


_PROVIDER_REGISTRY = {
    "gemini": "Gemini 2.0 Flash",
    "claude": "Claude 3 Haiku",
    "qwen": "Qwen 3.5 397B",
    "bytedance": "Bytedance Seed",
    "deepseek": "DeepSeek V3",
    "ollama": "Ollama Gemma",
    "mock": "Mock Terminal",
}
_DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "bytedance")


def _get_env_var(names: list[str]) -> Tuple[Optional[str], Optional[str]]:
    for name in names:
        value = os.getenv(name)
        if value:
            logger.info(f"Loaded environment variable: {name}")
            return value, name
    return None, None


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

class GeminiProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatGoogleGenerativeAI, "langchain-google-genai")
        logger.info("Initializing Gemini Provider...")
        api_key, key_name = _get_env_var(["GOOGLE_API_KEY", "GEMINI_API_KEY"])
        if not api_key:
            error_msg = "Neither GOOGLE_API_KEY nor GEMINI_API_KEY is set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        logger.info(f"Using Gemini model: {model_name}")
        
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            max_retries=10,
            timeout=180,
            temperature=0.0,
        )

class ClaudeProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatAnthropic, "langchain-anthropic")
        logger.info("Initializing Claude Provider...")
        api_key, key_name = _get_env_var(["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"])
        if not api_key:
            error_msg = "Neither ANTHROPIC_API_KEY nor CLAUDE_API_KEY is set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        model_name = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")
        logger.info(f"Using Claude model: {model_name}")
        return ChatAnthropic(model_name=model_name, anthropic_api_key=api_key)

class QwenProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOpenAI, "langchain-openai")
        logger.info("Initializing Qwen Provider (via NVIDIA)...")
        api_key, key_name = _get_env_var(["QWEN_API_KEY", "NVIDIA_API_KEY"])
        if not api_key:
            error_msg = "Neither QWEN_API_KEY nor NVIDIA_API_KEY is set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        model_name = os.getenv("QWEN_MODEL", "qwen/qwen3.5-397b-a17b")
        logger.info(f"Using Qwen model: {model_name}")
        
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://integrate.api.nvidia.com/v1",
            temperature=0.2,
            top_p=0.7,
            max_tokens=4096,
            model_kwargs={
                "frequency_penalty": 0,
                "presence_penalty": 0,
            }
        )

class BytedanceProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOpenAI, "langchain-openai")
        logger.info("Initializing Bytedance Provider (via NVIDIA)...")
        api_key, key_name = _get_env_var(["BYTEDANCE_API_KEY", "NVIDIA_API_KEY"])
        if not api_key:
            error_msg = "Neither BYTEDANCE_API_KEY nor NVIDIA_API_KEY is set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        model_name = os.getenv("BYTEDANCE_MODEL", "bytedance/seed-oss-36b-instruct")
        logger.info(f"Using Bytedance model: {model_name}")
        
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://integrate.api.nvidia.com/v1",
            temperature=1.1,
            top_p=0.95,
            max_tokens=4096,
            model_kwargs={
                "frequency_penalty": 0,
                "presence_penalty": 0,
            },
            extra_body={"thinking_budget": -1}
        )

class DeepSeekProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOpenAI, "langchain-openai")
        logger.info("Initializing DeepSeek Provider (via NVIDIA)...")
        api_key, key_name = _get_env_var(["DEEPSEEK_API_KEY", "NVIDIA_API_KEY"])
        if not api_key:
            error_msg = "DEEPSEEK_API_KEY (or NVIDIA_API_KEY) is not set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-ai/deepseek-v3.2")
        logger.info(f"Using DeepSeek model: {model_name}")
        
        return ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url="https://integrate.api.nvidia.com/v1",
            temperature=1.0,
            top_p=0.95,
            max_tokens=8192,
            model_kwargs={
                "frequency_penalty": 0,
                "presence_penalty": 0,
            },
            extra_body={"chat_template_kwargs": {"thinking": True}}
        )

class OllamaProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOllama, "langchain-ollama")
        base_url = os.getenv("OLLAMA_BASE_URL", "http://192.168.68.190:11434")
        model_name = os.getenv("OLLAMA_MODEL", "gemma4")
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
    providers = ["Bytedance Seed", "DeepSeek V3", "Qwen 3.5 397B", "Claude 3 Haiku", "Gemini 2.0 Flash", "Ollama Gemma"]
    if include_mock:
        providers.append("Mock Terminal")
    return providers


def get_default_provider_name() -> str:
    default_key = (_DEFAULT_PROVIDER or "").strip().lower()
    if default_key in _PROVIDER_REGISTRY:
        return _PROVIDER_REGISTRY[default_key]
    return "Bytedance Seed"


def normalize_provider_name(provider_name: Optional[str]) -> str:
    candidate = (provider_name or "").strip()
    if not candidate:
        return get_default_provider_name()

    # Try exact match with registry values first
    for val in _PROVIDER_REGISTRY.values():
        if candidate.lower() == val.lower():
            return val

    # Try mapping from keys
    key = candidate.lower()
    if key in _PROVIDER_REGISTRY:
        return _PROVIDER_REGISTRY[key]
        
    # Specific partial matches (avoiding broad 'nvidia' match)
    if "qwen" in key:
        return _PROVIDER_REGISTRY["qwen"]
    if "gemini" in key:
        return _PROVIDER_REGISTRY["gemini"]
    if "claude" in key:
        return _PROVIDER_REGISTRY["claude"]
    if "bytedance" in key or "seed" in key:
        return _PROVIDER_REGISTRY["bytedance"]
    if "deepseek" in key:
        return _PROVIDER_REGISTRY["deepseek"]
    if "ollama" in key:
        return _PROVIDER_REGISTRY["ollama"]
    if "mock" in key:
        return _PROVIDER_REGISTRY["mock"]
    
    # Last resort fallback for the generic 'nvidia' string
    if "nvidia" in key:
        return _PROVIDER_REGISTRY["qwen"]

    valid = ", ".join(list_supported_providers(include_mock=True))
    raise ValueError(f"Unsupported provider '{provider_name}'. Supported providers: {valid}")


def get_provider(provider_name: Optional[str]) -> LLMProvider:
    canonical_name = normalize_provider_name(provider_name)
    logger.info(f"Fetching provider: {canonical_name}")
    
    # Use internal keys for class mapping
    rev_registry = {v.lower(): k for k, v in _PROVIDER_REGISTRY.items()}
    provider_key = rev_registry.get(canonical_name.lower())

    if provider_key == "gemini":
        return GeminiProvider()
    if provider_key == "claude":
        return ClaudeProvider()
    if provider_key == "qwen":
        return QwenProvider()
    if provider_key == "bytedance":
        return BytedanceProvider()
    if provider_key == "deepseek":
        return DeepSeekProvider()
    if provider_key == "ollama":
        return OllamaProvider()
    if provider_key == "mock":
        return MockProvider()
    raise ValueError(f"Provider registry mismatch for '{canonical_name}'.")
