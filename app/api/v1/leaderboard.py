"""GET /leaderboard — top peer-point receivers this quarter (dashboard #4).

Identity: the shared app.core.actor actor dependency (Entra-enforced in
production, X-Demo-User only in the local dev environment) — one
actor-resolution rule, one place.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.leaderboard_repository import LeaderboardRepository
from app.schemas.leaderboard import LeaderboardResponse
from app.services.leaderboard_service import LeaderboardService

router = APIRouter(tags=["leaderboard"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> LeaderboardService:
    return LeaderboardService(LeaderboardRepository(session))


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[LeaderboardService, Depends(_service)],
    limit: Annotated[int, Query(ge=1, le=50)] = 5,
) -> LeaderboardResponse:
    return await service.top(caller_id=actor_id, limit=limit)
