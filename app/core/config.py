"""Application settings — every value comes from environment / .env, never code."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "rewards-portal-api"
    version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    environment: str = "local"
    log_level: str = "INFO"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/recog"

    otlp_endpoint: str | None = None

    # Entra ID SSO — all empty until the App registration is created by the team.
    entra_tenant_id: str = ""
    entra_client_id: str = ""
    entra_client_secret: str = ""
    entra_authority: str = ""
    # Dev fallback: when entra_authority is empty, get_current_user returns an
    # anonymous identity instead of requiring a JWT. NEVER set these in prod.

    # Outlook email via Microsoft Graph — mailbox empty → log-only sender.
    graph_mailbox: str = ""
    graph_client_id: str = ""
    graph_client_secret: str = ""
    graph_tenant_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
