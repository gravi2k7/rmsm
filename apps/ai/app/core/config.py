"""
Centralized, validated settings — the Python equivalent of @rmsm/config.
No module reads os.environ directly; import `settings` from here instead.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    node_env: str = "development"
    app_env: str = "local"

    ai_port: int = 8000
    ai_service_api_key: str | None = None
    openai_api_key: str | None = None

    api_base_url: str = "http://localhost:3001"


settings = Settings()
