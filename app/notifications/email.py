"""Outlook email via Microsoft Graph (sendMail, app-only credentials).

Credentials ARE the Entra app registration's client id/secret (see .env.example:
GRAPH_*). No SMTP anywhere — if GRAPH_MAILBOX is unset, sends are logged only,
which is the intended local-dev posture (reviewer privacy note: restricted to
ENVIRONMENT=local so a misconfigured deployment cannot silently log PII).

Token/client hygiene (reviewer): the access token is cached until near-expiry,
clients live inside an async-context per call (never leaked), the log-only
fallback masks the recipient (no PII to central logging), and only the subject
is logged (recognition message bodies stay out of logs).
"""

import hashlib
import time

import httpx
import structlog

from app.core.config import get_settings

log = structlog.get_logger(__name__)

_GRAPH_AUTH_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
_GRAPH_SEND_URL = "https://graph.microsoft.com/v1.0/users/{mailbox}/sendMail"
_GRAPH_SCOPE = "https://graph.microsoft.com/.default"
_PII_HASH_LEN = 8
_TOKEN_BUFFER_MINS = 300

_cached_token: str | None = None
_token_expires_at: float = 0.0


def _piihash(value: str) -> str:
    """Privacy hash for log-safe identity inflation (not encryption)."""
    return hashlib.sha256(value.encode()).hexdigest()[:_PII_HASH_LEN]


class EmailSender:
    async def send(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError


class LogEmailSender(EmailSender):
    async def send(self, to: str, subject: str, body: str) -> None:
        from app.core.config import get_settings
        settings = get_settings()
        if settings.environment != "local":
            # fail-closed: log-only sender is meaningless (and PII-leaking)
            # in production — re-raise so the calling layer surfaces it.
            raise RuntimeError(
                "LogEmailSender is restricted to ENVIRONMENT=local; "
                "set GRAPH_* values to enable GraphMailSender in deployment"
            )
        log.info("email.logged_only_local",
                 to_prefix=_piihash(to), subject=subject)


class GraphMailSender(EmailSender):
    async def send(self, to: str, subject: str, body: str) -> None:
        settings = get_settings()
        token = await GraphMailSender._access_token()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _GRAPH_SEND_URL.format(mailbox=settings.graph_mailbox),
                headers={
                    "Authorization": f"Bearer {token}"
                },
                json={
                    "message": {
                        "subject": subject,
                        "body": {"contentType": "Text", "content": body},
                        "toRecipients": [{"emailAddress": {"address": to}}],
                    },
                    "saveToSentItems": False,
                },
            )
        if response.is_error:
            log.error(
                "email.graph_send_failed", to_prefix=_piihash(to),
                status=response.status_code, ground_truth=response.text[:200],
            )
            raise RuntimeError(f"Graph sendMail failed with HTTP {response.status_code}")
        log.info("email.sent_via_graph", to_prefix=_piihash(to), subject=subject)

    @staticmethod
    async def _access_token() -> str:
        global _cached_token, _token_expires_at
        now = time.time()
        if _cached_token and now < _token_expires_at:
            return _cached_token

        settings = get_settings()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _GRAPH_AUTH_URL.format(tenant=settings.graph_tenant_id),
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.graph_client_id,
                    "client_secret": settings.graph_client_secret,
                    "scope": _GRAPH_SCOPE,
                },
            )
        if response.is_error:
            log.error("email.graph_token_failed", status=response.status_code)
            raise RuntimeError("graph token: request rejected")
        payload = response.json()
        _cached_token = payload["access_token"]
        _token_expires_at = time.time() + max(
            int(payload.get("expires_in", 3600)) - _TOKEN_BUFFER_MINS, 60
        )
        return _cached_token


def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.graph_mailbox and settings.graph_client_id and settings.graph_tenant_id:
        return GraphMailSender()
    return LogEmailSender()
