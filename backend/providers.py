import os
import logging
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_ollama import ChatOllama
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_openai import ChatOpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("Providers")

load_dotenv()

def _get_env_var(names: list[str]) -> Tuple[Optional[str], Optional[str]]:
    for name in names:
        value = os.getenv(name)
        if value:
            logger.info(f"Loaded environment variable: {name}")
            return value, name
    return None, None


class LLMProvider(ABC):
    @abstractmethod
    def get_model(self) -> BaseChatModel:
        pass

class GeminiProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
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
        logger.info("Initializing Claude Provider...")
        api_key, key_name = _get_env_var(["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"])
        if not api_key:
            error_msg = "Neither ANTHROPIC_API_KEY nor CLAUDE_API_KEY is set in your environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
            
        model_name = "claude-3-haiku-20240307"
        logger.info(f"Using Claude model: {model_name}")
        return ChatAnthropic(model_name=model_name, anthropic_api_key=api_key)

class NvidiaProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
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
            model_kwargs={
                "extra_body": {
                    "thinking_budget": -1
                }
            }
        )

class OllamaProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
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

def get_provider(provider_name: str) -> LLMProvider:
    logger.info(f"Fetching provider: {provider_name}")
    pn = provider_name.lower()
    if pn == "gemini":
        return GeminiProvider()
    elif pn == "claude":
        return ClaudeProvider()
    elif pn == "nvidia":
        return NvidiaProvider()
    elif pn == "bytedance":
        return BytedanceProvider()
    elif pn == "ollama":
        return OllamaProvider()
    elif pn == "mock":
        return MockProvider()
    else:
        logger.warning(f"Unknown provider '{provider_name}', defaulting to Ollama.")
        return OllamaProvider()
