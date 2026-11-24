"""GET /awards — the admin-authored catalog behind the leader/admin tab.

Identity: the shared app.core.actor dependency (same rule as showcase) —
the catalog itself is not personas-gated here; the portal page bounces
employees client-side.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.awards_repository import AwardsRepository
from app.schemas.awards import AwardsListResponse
from app.services.awards_service import AwardsService

router = APIRouter(tags=["awards"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> AwardsService:
    return AwardsService(AwardsRepository(session))


@router.get("/awards", response_model=AwardsListResponse)
async def awards(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[AwardsService, Depends(_service)],
) -> AwardsListResponse:
    return AwardsListResponse(awards=await service.list_awards())
