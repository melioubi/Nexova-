from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    secret_key: str = Field(validation_alias="SECRET_KEY")
    access_token_expire_minutes: int = Field(
        default=30,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
        gt=0,
    )
    tinydb_path: str = Field(
        default="data/auth",
        validation_alias="TINYDB_PATH",
    )
    database_url: Optional[str] = Field(
        default=None,
        validation_alias="DATABASE_URL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    try:
        return Settings()
    except Exception as e:
        raise RuntimeError(
            "Application configuration is invalid. Ensure .env exists with SECRET_KEY set."
        ) from e