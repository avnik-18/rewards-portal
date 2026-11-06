"""Application settings — every value comes from environment / .env, never code.

Identity configuration is fail-closed (reviewer auth comment):
- ENVIRONMENT must be set explicitly (local | production). An unset/blank
  ENVIRONMENT refuses to start — one missing variable can no longer silently
  enable the X-Demo-User dev fallback in a deployed environment.
- With ENVIRONMENT=production, ENTRA_* must be configured; the app refuses
  to start otherwise (see app/core/security.require_identity_configured).
- ENVIRONMENT=local allows the X-Demo-User dev fallback (dev only).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "rewards-portal-api"
    version: str = "0.1.0"
    api_prefix: str = "/api/v1"
    environment: str | None = None  # local | production — MUST be set explicitly
    log_level: str = "INFO"

    database_url: str = ""  # REQUIRED — start-up guard raises if empty

    otlp_endpoint: str | None = None

    # CORS — explicit origins; never "*" with credentials
    cors_origins: str = ""  # comma-separated list

    # Trusted-host list (Host-header validation drives off this). Comma-
    # separated; "*" is only acceptable for local dev. The start-up guard in
    # app/core/security.require_identity_configured refuses a non-local boot
    # with an empty or wildcard list.
    allowed_hosts: str = ""

    # gateway rate-limiting is documented; no hardcoded limiter in v1

    # Entra ID SSO — required whenever environment != local
    entra_tenant_id: str = ""
    entra_client_id: str = ""
    entra_client_secret: str = ""
    entra_authority: str = ""  # https://login.microsoftonline.com/<tenant>

    # Outlook email via Microsoft Graph — mailbox empty → log-only sender.
    graph_mailbox: str = ""
    graph_client_id: str = ""
    graph_client_secret: str = ""
    graph_tenant_id: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
