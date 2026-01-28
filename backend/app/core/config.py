from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional
import logging
import os

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str
    
    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = None
    
    # OpenAI / OpenRouter
    openai_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    use_openrouter: bool = False  # Set to True to use OpenRouter instead of OpenAI

    # Adzuna (Job Search)
    adzuna_app_id: Optional[str] = None
    adzuna_api_key: Optional[str] = None
    adzuna_country: str = "us"
    
    # JSearch (Job Search via RapidAPI)
    jsearch_api_key: Optional[str] = None
    jsearch_country: str = "us"
    
    # App
    api_url: str = "http://localhost:8000"
    environment: str = "development"
    
    # File uploads
    max_upload_size: int = 5 * 1024 * 1024  # 5MB
    upload_dir: str = "uploads"
    
    @model_validator(mode='after')
    def validate_ai_api_key(self):
        """Ensure at least one AI API key is configured"""
        # If using OpenRouter, we need OpenRouter key
        if self.use_openrouter:
            if not self.openrouter_api_key:
                logger.warning(
                    "USE_OPENROUTER is True but OPENROUTER_API_KEY is not set. "
                    "AI features will not work. Please set OPENROUTER_API_KEY in your .env file."
                )
        # If not using OpenRouter, we need OpenAI key
        elif not self.openai_api_key:
            logger.warning(
                "OPENAI_API_KEY is not set and USE_OPENROUTER is False. "
                "AI features will not work. Please set either OPENAI_API_KEY or enable OpenRouter."
            )
        
        return self
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Initialize settings with error handling
try:
    settings = Settings()
except Exception as e:
    env_file_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    error_msg = (
        f"Failed to load configuration. Please check your .env file at {env_file_path}\n"
        f"Required environment variables:\n"
        f"  - SUPABASE_URL\n"
        f"  - SUPABASE_ANON_KEY\n"
        f"  - SUPABASE_SERVICE_ROLE_KEY\n"
        f"  - DATABASE_URL\n"
        f"  - OPENAI_API_KEY (or OPENROUTER_API_KEY with USE_OPENROUTER=true)\n"
        f"\nError: {str(e)}"
    )
    logger.error(error_msg)
    raise ValueError(error_msg) from e
