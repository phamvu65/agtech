from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    app_name: str = "AGTECH-01"
    app_env: Literal["development", "production", "test"] = "development"
    cors_origins: str = "http://localhost:3000"
    database_url: SecretStr = SecretStr("postgresql+psycopg://agtech@127.0.0.1:5432/agtech")
    session_hours: int = Field(default=12, ge=1, le=168)


@lru_cache
def get_settings() -> Settings:
    return Settings()
