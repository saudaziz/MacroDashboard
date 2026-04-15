import os
from abc import ABC, abstractmethod
from typing import List, Optional
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.chat_models import ChatOllama
from langchain_core.language_models.chat_models import BaseChatModel
from dotenv import load_dotenv

load_dotenv()

class LLMProvider(ABC):
    @abstractmethod
    def get_model(self) -> BaseChatModel:
        pass

class GeminiProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is not set. Please add it to your .env file.")
        return ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=api_key)

class ClaudeProvider(LLMProvider):
    def get_model(self) -> BaseChatModel:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set. Please add it to your .env file.")
        return ChatAnthropic(model_name="claude-3-5-sonnet-20240620", anthropic_api_key=api_key)

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = "http://localhost:11434", model: str = "gemma2"):
        self.base_url = base_url
        self.model = model

    def get_model(self) -> BaseChatModel:
        return ChatOllama(base_url=self.base_url, model=self.model)

def get_provider(provider_name: str) -> LLMProvider:
    if provider_name.lower() == "gemini":
        return GeminiProvider()
    elif provider_name.lower() == "claude":
        return ClaudeProvider()
    elif provider_name.lower() == "ollama":
        return OllamaProvider()
    else:
        # Default to Gemini
        return GeminiProvider()
