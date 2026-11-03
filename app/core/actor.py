"""Actor resolution — the canonical dependency for every "me"-scoped route.

The actor is NEVER taken from the request body.
- Production (Entra configured): the actor is the JWT subject mapped through
  users.external_id. (Blocked on the org's App registration values.)
- Dev fallback (no Entra): an explicit X-Demo-User: <employee_code> header
  resolves the actor; this header is the ONLY dev affordance and becomes
  inert the moment Entra is configured.
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.repositories.applause_repository import ApplauseRepository


async def get_actor_id(
    x_demo_user: Annotated[str | None, Header()] = None,
    session: Annotated[AsyncSession | None, Depends(get_session)] = None,
) -> UUID:
    """Resolve the acting user's DB id."""
    sessionresolved = session if session is not None else None
    settings = get_settings()
    if settings.entra_authority:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "actor resolution requires the Entra JWT subject mapping "
            "(users.external_id) — blocked on the App registration",
        )
    if not x_demo_user:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "dev mode requires the X-Demo-User: <employee_code> header",
        )
    if sessionresolved is None:  # defensive: FastAPI always injects it
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "session missing")
    actor = await ApplauseRepository(sessionresolved).user_id_by_code(x_demo_user)
    if actor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown demo user: {x_demo_user}")
    return UUID(str(actor))
