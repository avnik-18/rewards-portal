"""Invariant: without Graph credentials the app must NOT attempt real email."""

from app.core.config import get_settings
from app.notifications.email import GraphMailSender, LogEmailSender, get_email_sender


def test_log_sender_is_default_without_credentials(monkeypatch) -> None:
    monkeypatch.setenv("ENVIRONMENT", "local")
    monkeypatch.delenv("GRAPH_MAILBOX", raising=False)
    monkeypatch.delenv("GRAPH_CLIENT_ID", raising=False)
    monkeypatch.delenv("GRAPH_TENANT_ID", raising=False)
    get_settings.cache_clear()
    try:
        assert isinstance(get_email_sender(), LogEmailSender)
    finally:
        get_settings.cache_clear()


def test_graph_sender_selected_with_credentials(monkeypatch) -> None:
    monkeypatch.setenv("GRAPH_MAILBOX", "noreply@example.com")
    monkeypatch.setenv("GRAPH_CLIENT_ID", "client-id")
    monkeypatch.setenv("GRAPH_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv("GRAPH_TENANT_ID", "tenant-id")
    get_settings.cache_clear()
    try:
        assert isinstance(get_email_sender(), GraphMailSender)
    finally:
        get_settings.cache_clear()
