"""Feed adapter — thin above FeedRepository.

The only rule beyond the SQL: the next FeedCursor is derived HERE in code —
only when a page fills the limit, from the last row's sort keys — never
inside the query, so paging stays a pure SQL-filter contract.
"""

from typing import Any
from uuid import UUID

from app.repositories.feed_repository import FeedRepository
from app.schemas.feed import FeedCursor


class FeedService:
    def __init__(self, repo: FeedRepository) -> None:
        self._repo = repo

    async def persona(self, actor_id: UUID) -> str:
        return await self._repo.persona(actor_id)

    async def feed_page(
        self, actor_id: UUID, limit: int, cursor: FeedCursor | None
    ) -> tuple[list[dict[str, Any]], FeedCursor | None]:
        cursor_dict = (
            {
                "cursor_score": cursor.score,
                "cursor_at": cursor.occurred_at,
                "cursor_recognition_id": cursor.recognition_id,
            }
            if cursor is not None
            else None
        )
        rows = await self._repo.page(actor_id, limit, cursor_dict)
        if len(rows) < limit:
            return rows, None
        last_row = rows[-1]
        next_cursor = FeedCursor(
            score=last_row["score"],
            occurred_at=last_row["occurred_at"],
            recognition_id=last_row["recognition_id"],
        )
        return rows, next_cursor
