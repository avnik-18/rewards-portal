"""Leaderboard adapter — thin above LeaderboardRepository.

The only rule beyond the SQL: `is_me` is authored in code, at the router's
DTO-shaping step, from the caller's identity — never inside the query. The
service returns raw rows; the router builds LeaderboardResponse.
"""

from typing import Any
from uuid import UUID

from app.repositories.leaderboard_repository import LeaderboardRepository


class LeaderboardService:
    def __init__(self, repo: LeaderboardRepository) -> None:
        self._repo = repo

    async def top(self, actor_id: UUID, limit: int = 5) -> list[dict[str, Any]]:
        return await self._repo.top_receivers(limit=limit)
