"""Start-up guard contract — fail-closed on the reviewed deployment holes.

require_identity_configured (called by create_app) refuses to boot when, in
any environment != local:
- ALLOWED_HOSTS is empty or "*": Host-header validation would read like a
  control while accepting every Host (reviewer comment)
- GRAPH_* email is unset: LogEmailSender raises on every send, so a
  misconfigured deployment would boot fine and fail every notification
  at runtime (reviewer fail-late comment)
- local keeps both allowances (dev convenience) — pinned here so the guards
  cannot silently tighten into breaking local dev.
"""

import os

os.environ.setdefault("ENVIRONMENT", "local")  # imports read settings

import pytest  # noqa: E402

import app.core.security as sec  # noqa: E402
from app.core.config import get_settings  # noqa: E402


def _prod_env(monkeypatch: pytest.MonkeyPatch, **overrides: str) -> None:
    values = {
        "ENVIRONMENT": "production",
        "DATABASE_URL": "postgresql+asyncpg://u:p@db.host:5432/recog",
        "ENTRA_AUTHORITY": "https://login.microsoftonline.com/tenant/v2.0",
        "ALLOWED_HOSTS": "www.rewards.example.com",
        "GRAPH_MAILBOX": "noreply@example.com",
        "GRAPH_CLIENT_ID": "client-id",
        "GRAPH_CLIENT_SECRET": "client-secret",
        "GRAPH_TENANT_ID": "tenant-id",
        **overrides,
    }
    for env_key, env_value in values.items():
        if env_value == "":
            monkeypatch.delenv(env_key, raising=False)
        else:
            monkeypatch.setenv(env_key, env_value)
    get_settings.cache_clear()


@pytest.fixture
def prod_env() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_production_full_config_boots(monkeypatch: pytest.MonkeyPatch, prod_env: None) -> None:
    _prod_env(monkeypatch)
    sec.require_identity_configured()


@pytest.mark.parametrize("allowed_hosts", ["", " ", "*"])
def test_wildcard_or_empty_hosts_refused_outside_local(
    monkeypatch: pytest.MonkeyPatch, prod_env: None, allowed_hosts: str
) -> None:
    _prod_env(monkeypatch, ALLOWED_HOSTS=allowed_hosts)
    with pytest.raises(sec.IdentityConfigError) as err:
        sec.require_identity_configured()
    assert "ALLOWED_HOSTS" in str(err.value)


def test_missing_graph_email_refused_outside_local(monkeypatch: pytest.MonkeyPatch, prod_env: None) -> None:
    _prod_env(monkeypatch, GRAPH_MAILBOX="", GRAPH_CLIENT_ID="")
    with pytest.raises(sec.IdentityConfigError) as err:
        sec.require_identity_configured()
    assert "GRAPH" in str(err.value)


def test_local_without_email_and_hosts_still_boots(monkeypatch: pytest.MonkeyPatch, prod_env: None) -> None:
    """local keeps the dev allowances (X-Demo-User, log-only email)."""
    monkeypatch.setenv("ENVIRONMENT", "local")
    monkeypatch.delenv("ALLOWED_HOSTS", raising=False)
    for env_key in ("GRAPH_MAILBOX", "GRAPH_CLIENT_ID", "GRAPH_CLIENT_SECRET", "GRAPH_TENANT_ID"):
        monkeypatch.delenv(env_key, raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@localhost:5432/recog")
    get_settings.cache_clear()
    sec.require_identity_configured()
