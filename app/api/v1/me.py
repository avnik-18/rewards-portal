"""GET /me, /me/stats, /me/company-wallet — the Home screen greeting + tiles.

All three endpoints are caller-scoped: the actor comes from the identity
dependency (get_actor_id) — never from the request.
"""

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.me_repository import MeRepository
from app.schemas.me import MeCompanyWalletResponse, MeProfileResponse, MeStatsResponse
from app.services.me_service import CompanyWalletForbidden, MeRepositoryMissing, MeService

log = structlog.get_logger(__name__)

router = APIRouter(tags=["me"])


def me_missing_handler(request: Request, exc: Exception) -> JSONResponse:
    """The actor resolved but no users row answers — map to 404, in one place."""
    if not isinstance(exc, MeRepositoryMissing):
        raise exc
    resolved_actor_id = getattr(request.state, "actor_id", None)
    log.warning(
        "me.actor_missing", path=request.url.path, actor_id=str(resolved_actor_id) if resolved_actor_id else None
    )
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "actor_not_found"})


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> MeService:
    return MeService(MeRepository(session))


@router.get("/me", response_model=MeProfileResponse)
async def me(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[MeService, Depends(_service)],
) -> MeProfileResponse:
    profile = await service.profile(actor_id)
    return MeProfileResponse(**profile)


@router.get("/me/stats", response_model=MeStatsResponse)
async def me_stats(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[MeService, Depends(_service)],
) -> MeStatsResponse:
    return MeStatsResponse(**await service.stats(actor_id))


def company_wallet_forbidden_handler(request: Request, exc: Exception) -> JSONResponse:
    """Only admins read the company wallet — everyone else is 403."""
    if not isinstance(exc, CompanyWalletForbidden):
        raise exc
    return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": "company_wallet_admin_only"})


@router.get("/me/company-wallet", response_model=MeCompanyWalletResponse)
async def me_company_wallet(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[MeService, Depends(_service)],
) -> MeCompanyWalletResponse:
    return MeCompanyWalletResponse(**await service.company_wallet(actor_id))
