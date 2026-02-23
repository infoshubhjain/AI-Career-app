"""
LLM Service Layer
Abstracts LLM provider (Ollama, OpenRouter) for easy swapping
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> str:
        """Generate text from prompt"""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the model name being used"""
        pass


class OllamaProvider(LLMProvider):
    """Ollama LLM provider"""
    
    def __init__(
        self,
        base_url: str = None,
        model: str = None
    ):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_MODEL
    
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> str:
        """
        Generate text using Ollama API
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text
        
        Raises:
            httpx.HTTPError: If API call fails
        """
        url = f"{self.base_url}/api/generate"
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        if response_format == "json":
            payload["format"] = "json"
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")
    
    def get_model_name(self) -> str:
        return self.model


class OpenRouterProvider(LLMProvider):
    """OpenRouter LLM provider (for future use)"""
    
    def __init__(
        self,
        api_key: str = None,
        model: str = None
    ):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL
        self.base_url = "https://openrouter.ai/api/v1"
    
    async def generate(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> str:
        """
        Generate text using OpenRouter API
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text
        
        Raises:
            httpx.HTTPError: If API call fails
        """
        url = f"{self.base_url}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens

        if response_format == "json":
            payload["response_format"] = {"type": "json_object"}
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    def get_model_name(self) -> str:
        return self.model


class LLMService:
    """
    Unified LLM service that selects the appropriate provider
    based on configuration
    """
    
    _provider: Optional[LLMProvider] = None
    
    @classmethod
    def get_provider(cls) -> LLMProvider:
        """
        Get the configured LLM provider
        
        Returns:
            LLMProvider instance
        """
        if cls._provider is None:
            provider_name = settings.LLM_PROVIDER.lower()
            
            if provider_name == "ollama":
                cls._provider = OllamaProvider()
            elif provider_name == "openrouter":
                cls._provider = OpenRouterProvider()
            else:
                raise ValueError(f"Unknown LLM provider: {provider_name}")
        
        return cls._provider
    
    @classmethod
    async def generate(
        cls,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[str] = None
    ) -> str:
        """
        Generate text using the configured provider
        
        Args:
            prompt: Input prompt
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Generated text
        """
        provider = cls.get_provider()
        return await provider.generate(
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format
        )
    
    @classmethod
    def get_model_name(cls) -> str:
        """Get the model name being used"""
        provider = cls.get_provider()
        return provider.get_model_name()
