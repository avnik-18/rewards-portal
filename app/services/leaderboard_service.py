"""Leaderboard business rules — thin above LeaderboardRepository.

The only rule beyond the SQL: `is_me` is authored in code, at this layer,
from the caller's identity — never inside the query.
"""

from typing import Any
from uuid import UUID

from app.repositories.leaderboard_repository import LeaderboardRepository
from app.schemas.leaderboard import LeaderboardEntryResponse, LeaderboardResponse


class LeaderboardService:
    def __init__(self, repo: LeaderboardRepository) -> None:
        self._repo = repo

    async def top(self, caller_id: UUID, limit: int = 5) -> LeaderboardResponse:
        rows: list[dict[str, Any]] = await self._repo.top_receivers(limit=limit)
        entries = [
            LeaderboardEntryResponse(
                rank=row["rank"],
                name=row["name"],
                points=row["points"],
                is_me=row["userId"] == caller_id,
            )
            for row in rows
        ]
        return LeaderboardResponse(entries=entries)
