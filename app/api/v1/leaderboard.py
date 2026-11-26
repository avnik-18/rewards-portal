"""GET /leaderboard — top award-point winners, board scoped to the caller's
teams (dashboard #4). Award wins only (see LeaderboardRepository).

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
from app.schemas.leaderboard import LeaderboardEntryResponse, LeaderboardResponse
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
    rows = await service.top(actor_id=actor_id, limit=limit)
    entries = [
        LeaderboardEntryResponse(
            user_id=row["user_id"],
            rank=row["rank"],
            name=row["name"],
            points=row["points"],
            is_me=row["user_id"] == actor_id,
        )
        for row in rows
    ]
    return LeaderboardResponse(entries=entries)
