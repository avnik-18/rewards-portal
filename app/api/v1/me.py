"""GET /me and /me/stats — the Home screen greeting + "My activity" tiles.

Both endpoints are caller-scoped: the actor comes from the identity
dependency (get_actor_id) — never from the request.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.me_repository import MeRepository
from app.schemas.me import MeProfileResponse, MeStatsResponse
from app.services.me_service import MeService

router = APIRouter(tags=["me"])


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
