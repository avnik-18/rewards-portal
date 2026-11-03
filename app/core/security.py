"""Identity preflight gate + Entra JWT verification.

Design contract (reviewer auth comments 17e11a3 + 314e687 follow-ups):
- ONE dependency resolves identity for every route: app.core.actor.get_actor_id,
  always returning the resolved users.id (UUID). The X-Demo-User dev fallback
  only exists when ENVIRONMENT == "local"; production routes resolve via the
  verified JWT subject.
- Fail-closed at START-UP: main.create_app calls require_identity_configured —
  an app launched without identity configuration refuses to start instead of
  serving an open-impersonation fallback, and ENVIRONMENT unset (one missing
  variable) no longer silently enables dev impersonation in deployment.

Entra verification is implemented (not a 501 stub):
- the tenant's OpenID configuration and JWKS are fetched asynchronously
  (never blocking the event loop) and cached/refreshed
- signature (RS256 via the JWKS), iss, aud, exp/nbf are verified with PyJWT
- failures return a GENERIC 401 ("authentication failed") to the caller —
  the specific reason is logged server-side only (no token-error leakage in
  responses, reviewer follow-up)
- the actor dependency maps the token's oid claim to users.external_id
  (users.id)
"""

import time
from typing import Any

import httpx
import jwt
import structlog
from fastapi import HTTPException, status

from app.core.config import get_settings

log = structlog.get_logger(__name__)

_JWKS_MAX_AGE = 900  # seconds
_OIDC_CONFIG: dict[str, Any] | None = None
_JWKS: dict[str, Any] | None = None
_JWKS_FETCHED_AT: float = 0.0

_GENERIC_AUTH_FAIL = "authentication failed"


class IdentityConfigError(RuntimeError):
    """Raised at start-up when no identity configuration is usable."""


def require_identity_configured() -> None:
    """Refuse to start without an explicit identity configuration.

    Called by main.create_app: ENVIRONMENT must be set, and non-local
    environments must have the Entra values — so a missing variable can no
    longer fall back to the X-Demo-User demo identity in a deployed
    environment (the reviewer's fail-open concern)."""
    settings = get_settings()
    if not settings.database_url:
        raise IdentityConfigError(
            "DATABASE_URL is required — refusing to start without a database"
        )
    if settings.environment is None:
        raise IdentityConfigError(
            "ENVIRONMENT is not set (local|production) — refusing to start: "
            "identity would otherwise fall back to the X-Demo-User demo mode, "
            "which is open impersonation in any deployed environment"
        )
    if settings.environment != "local" and not settings.entra_authority:
        raise IdentityConfigError(
            f"ENVIRONMENT={settings.environment} requires the Entra ID "
            "configuration (ENTRA_TENANT_ID / ENTRA_CLIENT_ID / "
            "ENTRA_CLIENT_SECRET / ENTRA_AUTHORITY) — refusing to start"
        )


async def _load_oidc_config() -> dict[str, Any]:
    """Fetch the tenant's OpenID configuration once (cached for the process).

    Async on purpose: a sync network call inside the event loop would block
    every request until this request's fetch completes (reviewer follow-up)."""
    global _OIDC_CONFIG
    settings = get_settings()
    if _OIDC_CONFIG is None:
        base = settings.entra_authority.rstrip("/")
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{base}/.well-known/openid-configuration")
        response.raise_for_status()
        _OIDC_CONFIG = response.json()
        log.info("entra.oidc_config_loaded", authority=settings.entra_authority)
    return _OIDC_CONFIG


async def _load_jwks() -> dict[str, Any]:
    """Fetch the tenant's signing keys; refresh when older than the max age."""
    global _JWKS, _JWKS_FETCHED_AT
    now = time.monotonic()
    if _JWKS is None or now - _JWKS_FETCHED_AT > _JWKS_MAX_AGE:
        jwks_uri = (await _load_oidc_config())["jwks_uri"]
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(jwks_uri)
        response.raise_for_status()
        _JWKS = response.json()
        _JWKS_FETCHED_AT = now
    return _JWKS


async def validate_entra_jwt(token: str) -> str:
    """Verify an Entra token and return its oid claim — the value mapped to
    users.external_id (and users.id downstream) by the actor dependency.

    Failure detail policy (reviewer follow-up): clients get the GENERIC
    "authentication failed" — the precise reason (bad signature, unknown key,
    wrong issuer/audience, expired) is logged server-side via structlog to
    avoid leaking verification internals to callers."""
    if not get_settings().entra_authority:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "authentication is not configured for this environment",
        )
    oidc = await _load_oidc_config()
    jwks = await _load_jwks()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        log.warning("entra.token_rejected", reason="malformed token", detail=str(e))
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _GENERIC_AUTH_FAIL) from e
    kid = header.get("kid")
    jwk_by_kid = {jwk_key.get("kid"): jwk_key for jwk_key in jwks.get("keys", [])}
    if kid not in jwk_by_kid:
        log.warning("entra.token_rejected", reason="kid not in tenant JWKS", kid=kid)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _GENERIC_AUTH_FAIL)
    key = jwt.PyJWK.from_dict(jwk_by_kid[kid]).key
    try:
        claims = jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=get_settings().entra_client_id,
            issuer=str(oidc["issuer"]),
            leeway=60,
            options={"require": ["exp", "iat", "nbf", "iss", "aud", "sub", "oid"]},
        )
    except jwt.PyJWTError as e:
        log.warning("entra.token_rejected", reason=str(e))
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _GENERIC_AUTH_FAIL) from e
    oid = claims.get("oid")
    if not oid:
        log.warning("entra.token_rejected", reason="token carries no oid claim")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _GENERIC_AUTH_FAIL)
    return str(oid)
