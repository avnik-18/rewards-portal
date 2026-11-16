"""Bell-panel adapter — thin above NotificationsListRepository."""

from typing import Any
from uuid import UUID

from app.repositories.notifications_list_repository import NotificationsListRepository


class NotificationsListService:
    def __init__(self, repo: NotificationsListRepository) -> None:
        self._repo = repo

    async def unread_feed(self, actor_id: UUID, limit: int = 20) -> list[dict[str, Any]]:
        return await self._repo.unread_feed(actor_id=actor_id, limit=limit)

    async def mark_all_read(self, actor_id: UUID) -> int:
        return await self._repo.mark_all_read(actor_id=actor_id)
