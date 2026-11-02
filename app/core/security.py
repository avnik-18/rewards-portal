"""SSO — Microsoft Entra ID.

Dev fallback: when ENTRA_AUTHORITY is empty, every request gets an anonymous
identity. Once the App registration exists (tenant id, client id, authority),
TODO::_validate_entra_jwt becomes the enforced path.
"""

from typing import Annotated

from fastapi import Header, HTTPException, status

from app.core.config import get_settings
from app.schemas.auth import CurrentUser


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    settings = get_settings()
    if not settings.entra_authority:
        # Dev fallback: no App registration configured yet.
        return CurrentUser(id="anonymous", email=None, role="dev")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = authorization.split(" ", 1)[1]
    return _validate_entra_jwt(token)


def _validate_entra_jwt(token: str) -> CurrentUser:
    """TODO Entra:
    1. Fetch JWKS from {ENTRA_AUTHORITY}/discovery/v2.0/keys (cache it).
    2. Verify signature, then claims: iss == authority, aud == ENTRA_CLIENT_ID,
       exp/nbf sane, idtyp/access or scp scope check.
    3. Map the caller to a portal person by email/object-id claim.
    Blocked on: org App registration values (see .env.example).
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Entra JWT validation not wired yet",
    )
