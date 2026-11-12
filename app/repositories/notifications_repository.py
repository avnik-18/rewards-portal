"""Repository for notification badge queries — SQL only, never HTTP errors.

`read_at IS NULL AND delivery_status IN ('queued', 'sent')` is the unread
definition — matching the schema's partial index on those predicates, so a
failed delivery never permanently inflates the badge (Shourya's review
round). Rows keep their own user scope so no other viewer's badge can ever
bleed into this count.
"""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationsRepository:
    """Notifications pattern methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def unread_count(self, user_id: UUID) -> int:
        result = await self._session.execute(
            text(
                "SELECT COUNT(*)::int FROM notification "
                "WHERE user_id = :user_id AND read_at IS NULL "
                "  AND delivery_status IN ('queued', 'sent')"
            ),
            dict(user_id=user_id),
        )
        counted = result.scalar_one()
        return int(counted)
