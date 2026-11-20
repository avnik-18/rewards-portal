"""GET /celebrations — upcoming birthdays + work anniversaries for the rail.

Actor-scoped: relevance resolves against the caller's org relationships
(admins see the whole org). The window is capped server-side by the service.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.celebrations_repository import CelebrationsRepository
from app.schemas.celebration import CelebrationResponse
from app.services.celebrations_service import DEFAULT_WINDOW_DAYS, CelebrationsService

router = APIRouter(tags=["celebrations"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> CelebrationsService:
    return CelebrationsService(CelebrationsRepository(session))


@router.get("/celebrations", response_model=list[CelebrationResponse])
async def celebrations(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[CelebrationsService, Depends(_service)],
    days: Annotated[int, Query(ge=1, le=120)] = DEFAULT_WINDOW_DAYS,
) -> list[CelebrationResponse]:
    rows = await service.upcoming(actor_id, days)
    return [CelebrationResponse(**row) for row in rows]
