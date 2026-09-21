from functools import lru_cache

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
    reset_token_expire_minutes: int = Field(
        default=30,
        validation_alias="RESET_TOKEN_EXPIRE_MINUTES",
        gt=0,
    )
    resend_api_key: str = Field(
        default="",
        validation_alias="RESEND_API_KEY",
    )
    email_from: str = Field(
        default="noreply@nexova.com",
        validation_alias="EMAIL_FROM",
    )
    frontend_url: str = Field(
        default="http://localhost:3000",
        validation_alias="FRONTEND_URL",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()