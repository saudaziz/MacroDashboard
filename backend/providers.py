import os
import logging
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from langchain_core.language_models.chat_models import BaseChatModel
from dotenv import load_dotenv

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

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Providers")

load_dotenv()


_PROVIDER_REGISTRY = {
    "gemini": "Gemini",
    "claude": "Claude",
    "nvidia": "Nvidia",
    "bytedance": "Bytedance",
    "ollama": "Ollama",
    "mock": "Mock",
}
_DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "Nvidia")


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

class NvidiaProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatNVIDIA, "langchain-nvidia-ai-endpoints")
        logger.info("Initializing Nvidia Provider...")
        api_key, key_name = _get_env_var(["NVIDIA_API_KEY"])
        if not api_key:
            error_msg = "NVIDIA_API_KEY is not set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        model_name = os.getenv("NVIDIA_MODEL", "qwen/qwen2.5-coder-32b-instruct")
        logger.info(f"Using Nvidia model: {model_name}")
        
        return ChatNVIDIA(
            model=model_name,
            api_key=api_key,
            temperature=0.2,
            top_p=0.7,
            max_tokens=1024,
        )

class BytedanceProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        _require_dependency(ChatOpenAI, "langchain-openai")
        logger.info("Initializing Bytedance Provider (via NVIDIA)...")
        api_key, key_name = _get_env_var(["BYTEDANCE_API_KEY"])
        if not api_key:
            error_msg = "BYTEDANCE_API_KEY is not set in your environment."
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
            extra_body={"thinking_budget": -1}
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
    providers = ["Nvidia", "Claude", "Gemini", "Bytedance", "Ollama"]
    if include_mock:
        providers.append("Mock")
    return providers


def get_default_provider_name() -> str:
    default_key = (_DEFAULT_PROVIDER or "").strip().lower()
    if default_key in _PROVIDER_REGISTRY:
        return _PROVIDER_REGISTRY[default_key]
    return "Nvidia"


def normalize_provider_name(provider_name: Optional[str]) -> str:
    candidate = (provider_name or "").strip()
    if not candidate:
        return get_default_provider_name()

    key = candidate.lower()
    if key not in _PROVIDER_REGISTRY:
        valid = ", ".join(list_supported_providers(include_mock=True))
        raise ValueError(f"Unsupported provider '{provider_name}'. Supported providers: {valid}")
    return _PROVIDER_REGISTRY[key]


def get_provider(provider_name: Optional[str]) -> LLMProvider:
    canonical_name = normalize_provider_name(provider_name)
    logger.info(f"Fetching provider: {canonical_name}")
    provider_key = canonical_name.lower()

    if provider_key == "gemini":
        return GeminiProvider()
    if provider_key == "claude":
        return ClaudeProvider()
    if provider_key == "nvidia":
        return NvidiaProvider()
    if provider_key == "bytedance":
        return BytedanceProvider()
    if provider_key == "ollama":
        return OllamaProvider()
    if provider_key == "mock":
        return MockProvider()
    raise ValueError(f"Provider registry mismatch for '{canonical_name}'.")
