"""Actor resolution — THE identity dependency for every "me"-scoped route.

Returns the resolved users.id (UUID) on every route, from one of exactly two
paths, both resolved server-side:

- Production / any non-local environment (reviewer auth fix): the caller's
  Bearer JWT is verified with the tenant JWKS (app.core.security.validate_entra_jwt) and its
  oid claim is mapped to users.external_id — the routes can never receive
  an identity from the request body, and a deployed app without identity
  configuration refuses to start (app.core.security.preflight).
- Dev fallback (ENVIRONMENT == "local" ONLY): X-Demo-User: <employee_code>
  resolves the actor; inert in every deployed environment.

The resolved actor is stashed on request.state.actor_id so downstream
logging never uses the raw (attacker-controlled) X-Demo-User header
(reviewer log-injection note)."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import validate_entra_jwt
from app.db.session import get_session
from app.repositories.applause_repository import ApplauseRepository


async def get_actor_id(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_demo_user: Annotated[str | None, Header()] = None,
    session: Annotated[AsyncSession | None, Depends(get_session)] = None,
) -> UUID:
    settings = get_settings()
    if session is None:  # defensive: FastAPI always injects it
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "db session missing")
    repo = ApplauseRepository(session)

    if settings.environment == "local":
        if not x_demo_user:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "dev mode requires the X-Demo-User: <employee_code> header",
            )
        actor = await repo.user_id_by_code(x_demo_user)
        if actor is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown demo user: {x_demo_user}")
    else:
        if authorization is None or not authorization.lower().startswith("bearer "):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                                "Authorization: Bearer token required")
        token = authorization.split(" ", 1)[1]
        oid = await validate_entra_jwt(token)
        actor = await repo.user_id_by_external_id(oid)
        if actor is None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "SSO identity is authenticated but has no portal mapping "
                "(users.external_id) — ask HR to provision the account",
            )
    request.state.actor_id = UUID(str(actor))
    return UUID(str(actor))
