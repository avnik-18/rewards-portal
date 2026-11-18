"""Reads + mark-read for the bell panel — SQL only, no HTTP errors.

Unread = read_at IS NULL AND delivery_status IN ('queued','sent') — the SAME
definition as the unread-count badge (sir's review kept the two identical),
so the panel's list and the badge can never disagree.

"Who recognised whom" needs the giver's name: the feed rows live in
`notification` with a dedupe_key shaped `praise:<recognition_id>:<user_id>`;
the read joins recognition_history on that id — read-side enrichment, no fn
change, no migration. The uuid shape is pinned to an exact 8-4-4-4-12 hex
regex BEFORE the ::uuid cast, so a malformed dedupe key degrades to a row
without giver/points instead of failing the whole feed (fn_notify accepts
arbitrary p_dedupe spellings). POINTS come from n.payload->>'points' — the
PRODUCER writes the per-recipient share there; recognition_history carries
the giver's TOTAL, which would inflate splits — payload wins, base_points is
the fallback for rows predating the payload field.

"Read once, it disappears": POST /read marks every delivered+unread row for
the caller read now — afterwards the unread list is empty and the badge is
0 (the COUNT and the list share the same WHERE).
"""

from typing import Any, cast
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Postgres substring-FROM returns the FIRST parenthesised group, so the uuid
# capture sits first; the 'praise…' prefix family (praise / praise_sent /
# praise_cc) is matched with one loose POSIX class.
_PRAISE_KEY = r"^praise[a-z_]*\:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\:"


class NotificationsListRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def unread_feed(self, actor_id: UUID, limit: int) -> list[dict[str, Any]]:
        result = await self._session.execute(
            text(
                "SELECT n.id, n.type, n.created_at, "
                "       g.full_name AS giver_name, "
                "       subj.full_name AS receiver_name, "
                "       COALESCE(subj.receivers_count, 0) AS receiver_count_, "
                "       COALESCE((n.payload->>'points')::int, rh.base_points) AS points_, "
                "       rh.message AS message_ "
                "FROM notification n "
                "LEFT JOIN LATERAL ("
                "  SELECT rh2.id, rh2.message, rh2.base_points, rh2.from_user_id"
                "    FROM recognition_history rh2"
                "   WHERE rh2.id = (substring(n.dedupe_key FROM :key_shape))::uuid"
                ") rh ON true "
                "LEFT JOIN users g ON g.id = rh.from_user_id "
                "LEFT JOIN LATERAL ("
                "  SELECT u1.full_name,"
                "         (SELECT count(*) FROM recognition_recipients rr2"
                "           WHERE rr2.recognition_id = rh.id AND rr2.kind = 'to') AS receivers_count"
                "    FROM recognition_recipients rr1"
                "    JOIN users u1 ON u1.id = rr1.user_id"
                "   WHERE rr1.recognition_id = rh.id AND rr1.kind = 'to'"
                "   ORDER BY rr1.user_id LIMIT 1"
                ") subj ON true "
                "WHERE n.user_id = :actor AND n.read_at IS NULL "
                "  AND n.delivery_status IN ('queued','sent') "
                "ORDER BY n.created_at DESC, n.id DESC LIMIT :limit"
            ),
            dict(actor=actor_id, limit=limit, key_shape=_PRAISE_KEY),
        )
        rows: list[dict[str, Any]] = []
        for row in result.mappings().all():
            created_at = row["created_at"]
            rows.append(
                dict(
                    id=row["id"],
                    type=row["type"],
                    giver_name=row["giver_name"],
                    receiver_name=row["receiver_name"],
                    receiver_count=row["receiver_count_"],
                    points=row["points_"],
                    message=row["message_"],
                    # isoformat() — a T, not Postgres' space separator: keeps
                    # new Date() on every client nomination standard
                    created_at=created_at.isoformat(),
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
        # Result[Any] typing hides CursorResult.rowcount from mypy; the update
        # always returns a CursorResult, so the value is real at runtime.
        rowcount = cast(Any, result).rowcount
        return int(rowcount or 0)
