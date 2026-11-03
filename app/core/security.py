"""Identity preflight gate + Entra JWT verification.

Design contract (per the reviewer's auth comment):
- ONE dependency resolves identity for every route: app.core.actor.get_actor_id,
  always returning the resolved users.id (UUID). The X-Demo-User dev fallback
  only exists when ENVIRONMENT == "local"; production routes resolve via the
  verified JWT subject.
- Fail-closed at START-UP: main.create_app calls require_identity_configured —
  an app launched without identity configuration refuses to start instead of
  serving an open-impersonation fallback, and ENVIRONMENT unset (one missing
  variable) no longer silently enables dev impersonation in deployment.

Entra verification is implemented (not a 501 stub):
- the tenant's OpenID configuration is fetched once and its JWKS cached/refreshed
- signature (RS256 via the JWKS), iss, aud, exp/nbf are verified with PyJWT
- the actor dependency maps the token's oid claim to users.external_id (users.id)
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


class IdentityConfigError(RuntimeError):
    """Raised at start-up when no identity configuration is usable."""


def require_identity_configured() -> None:
    """Refuse to start without an explicit identity configuration.

    Called by main.create_app: ENVIRONMENT must be set, and non-local
    environments must have the Entra values — so a missing variable can no
    longer fall back to the X-Demo-User demo identity in a deployed
    environment (the reviewer's fail-open concern)."""
    settings = get_settings()
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


def _load_oidc_config() -> dict[str, Any]:
    """Fetch the tenant's OpenID configuration once (cached for the process)."""
    global _OIDC_CONFIG
    settings = get_settings()
    if _OIDC_CONFIG is None:
        base = settings.entra_authority.rstrip("/")
        response = httpx.get(f"{base}/.well-known/openid-configuration", timeout=15.0)
        response.raise_for_status()
        _OIDC_CONFIG = response.json()
        log.info("entra.oidc_config_loaded", authority=settings.entra_authority)
    return _OIDC_CONFIG


def _load_jwks() -> dict[str, Any]:
    """Fetch the tenant's signing keys; refresh when older than the max age."""
    global _JWKS, _JWKS_FETCHED_AT
    now = time.monotonic()
    if _JWKS is None or now - _JWKS_FETCHED_AT > _JWKS_MAX_AGE:
        jwks_uri = _load_oidc_config()["jwks_uri"]
        response = httpx.get(jwks_uri, timeout=15.0)
        response.raise_for_status()
        _JWKS = response.json()
        _JWKS_FETCHED_AT = now
    return _JWKS


def _validate_entra_jwt(token: str) -> str:
    """Verify an Entra token and return its oid claim — the value mapped to
    users.external_id (and users.id downstream) by the actor dependency.
    Raises HTTPException(401) with the verification reason on any failure."""
    if not get_settings().entra_authority:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "authentication is not configured for this environment",
        )
    oidc = _load_oidc_config()
    jwks = _load_jwks()
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"malformed token: {e}") from e
    kid = header.get("kid")
    jwk_by_kid = {jwk_key.get("kid"): jwk_key for jwk_key in jwks.get("keys", [])}
    if kid not in jwk_by_kid:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "token signed with a key not in the tenant JWKS"
        )
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
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"invalid token: {e}") from e
    oid = claims.get("oid")
    if not oid:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "token carries no oid claim")
    return str(oid)
