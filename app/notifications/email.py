"""Outlook email via Microsoft Graph (sendMail, app-only credentials).

Credentials ARE the Entra app registration's client id/secret (see .env.example:
GRAPH_*). No SMTP anywhere — if GRAPH_MAILBOX is unset, sends are logged only,
which is the correct local-dev posture.
"""

import structlog
from httpx import AsyncClient

from app.core.config import get_settings

log = structlog.get_logger(__name__)

GRAPH_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
GRAPH_SEND_URL = "https://graph.microsoft.com/v1.0/users/{mailbox}/sendMail"
GRAPH_SCOPE = "https://graph.microsoft.com/.default"


class EmailSender:
    async def send(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError


class LogEmailSender(EmailSender):
    async def send(self, to: str, subject: str, body: str) -> None:
        log.info("email.logged_only", to=to, subject=subject, body=body)


class GraphMailSender(EmailSender):
    async def send(self, to: str, subject: str, body: str) -> None:
        settings = get_settings()
        token = await self._access_token()
        response = await AsyncClient().post(
            GRAPH_SEND_URL.format(mailbox=settings.graph_mailbox),
            headers={"Authorization": f"Bearer {token}"},
            json={"message": {"subject": subject, "body": {"contentType": "Text", "content": body}, "toRecipients": [{"emailAddress": {"address": to}}]}, "saveToSentItems": False},
            timeout=30.0,
        )
        if response.status_code >= 400:
            log.error("email.graph_send_failed", to=to, status=response.status_code, detail=response.text)
            raise RuntimeError(f"Graph sendMail failed with HTTP {response.status_code}")
        log.info("email.sent_via_graph", to=to, subject=subject)

    async def _access_token(self) -> str:
        settings = get_settings()
        response = await AsyncClient().post(
            GRAPH_TOKEN_URL.format(tenant=settings.graph_tenant_id),
            data={
                "grant_type": "client_credentials",
                "client_id": settings.graph_client_id,
                "client_secret": settings.graph_client_secret,
                "scope": GRAPH_SCOPE,
            },
            timeout=30.0,
        )
        if response.status_code >= 400:
            log.error("email.graph_token_failed", status=response.status_code)
            raise RuntimeError("Graph token request failed")
        return str(response.json()["access_token"])


def get_email_sender() -> EmailSender:
    settings = get_settings()
    if settings.graph_mailbox and settings.graph_client_id and settings.graph_tenant_id:
        return GraphMailSender()
    return LogEmailSender()
