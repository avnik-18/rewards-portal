"""Repository for the persona feed — SQL only, never HTTP errors.

Wraps the fn_feed_posts / fn_persona database functions; row shapes match
their declared RETURN TABLE columns exactly. `recipients` is passed through
from the driver's jsonb value, never reshaped here.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class FeedRepository:
    """Feed read methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def page(self, viewer_id: UUID, limit: int, cursor: dict[str, Any] | None) -> list[dict[str, Any]]:
        """One tiered page from fn_feed_posts, optionally after a keyset cursor."""
        cursor_keys = cursor or {}
        result = await self._session.execute(
            text("SELECT * FROM fn_feed_posts(:viewer, :limit, :last_tier, :last_at, :last_id)"),
            dict(
                viewer=viewer_id,
                limit=limit,
                last_tier=cursor_keys.get("cursor_tier"),
                last_at=cursor_keys.get("cursor_at"),
                last_id=cursor_keys.get("cursor_recognition_id"),
            ),
        )
        return [
            dict(
                recognition_id=row["recognition_id"],
                tier=row["tier"],
                occurred_at=row["occurred_at"],
                giver_id=row["giver_id"],
                giver_name=row["giver_name"],
                giver_avatar=row["giver_avatar"],
                kind=row["kind"],
                message=row["message"],
                points=row["points"],
                value_label=row["value_label"],
                recipients=row["recipients"],
            )
            for row in result.mappings().all()
        ]

    async def persona(self, viewer_id: UUID) -> str:
        """The viewer's feed persona from fn_persona."""
        result = await self._session.execute(
            text("SELECT fn_persona(:viewer)"),
            dict(viewer=viewer_id),
        )
        scalar: str = result.scalar_one()
        return scalar
