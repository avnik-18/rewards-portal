"""Reads + mark-read for the bell panel — SQL only, no HTTP errors.

Unread = read_at IS NULL AND delivery_status IN ('queued','sent') — the SAME
definition as the unread-count badge (sir's review kept the two identical),
so the panel's list and the badge can never disagree.

"Who recognised whom" needs the giver's name: the feed rows live in
`notification` with a dedupe_key shaped `praise:<recognition_id>:<user_id>`;
the read parses JUST the leading recognition id (the regex stops at the next
colon) and joins recognition_history → the GIVER's full_name — read-side
enrichment, no fn change, no migration (the payload carries only points;
nothing in the DB stores the giver against the row).

"Read once, it disappears": POST /read marks every delivered+unread row for
the caller read now — afterwards the unread list is empty and the badge is
0 (the COUNT and the list share the same WHERE).
"""

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationsListRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def unread_feed(self, actor_id: UUID, limit: int) -> list[dict[str, Any]]:
        result = await self._session.execute(
            text(
                "SELECT n.id, n.type, n.payload, n.created_at, "
                "       g.full_name AS giver_name, "
                "       rh.base_points AS points_, rh.message AS message_ "
                "FROM notification n "
                "LEFT JOIN LATERAL ("
                "  SELECT rh2.id, rh2.message, rh2.base_points, rh2.from_user_id"
                "    FROM recognition_history rh2"
                "   WHERE rh2.id = (substring(n.dedupe_key from '^praise:([0-9a-f-]+):') )::uuid"
                ") rh ON true "
                "LEFT JOIN users g ON g.id = rh.from_user_id "
                "WHERE n.user_id = :actor AND n.read_at IS NULL "
                "  AND n.delivery_status IN ('queued','sent') "
                "ORDER BY n.created_at DESC LIMIT :limit"
            ),
            dict(actor=actor_id, limit=limit),
        )
        rows: list[dict[str, Any]] = []
        for row in result.mappings().all():
            rows.append(
                dict(
                    id=row["id"],
                    type=row["type"],
                    giver_name=row["giver_name"],
                    points=row["points_"],
                    message=row["message_"],
                    created_at=str(row["created_at"]),
                )
            )
        return rows

    async def mark_all_read(self, actor_id: UUID) -> int:
        result = await self._session.execute(
            text(
                "UPDATE notification SET read_at = now() "
                "WHERE user_id = :actor AND read_at IS NULL "
                "  AND delivery_status IN ('queued','sent')"
            ),
            dict(actor=actor_id),
        )
        return int(result.rowcount or 0)
