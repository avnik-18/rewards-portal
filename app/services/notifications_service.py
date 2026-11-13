"""Notifications badge adapter — thin above NotificationsRepository."""

from uuid import UUID

from app.repositories.notifications_repository import NotificationsRepository


class NotificationsService:
    def __init__(self, repo: NotificationsRepository) -> None:
        self._repo = repo

    async def unread_count(self, actor_id: UUID) -> int:
        return await self._repo.unread_count(actor_id)
