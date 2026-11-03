"""Notifications badge rules — thin above NotificationsRepository."""

from typing import Protocol
from uuid import UUID

from app.schemas.notifications import UnreadCountResponse


class NotificationsReader(Protocol):
    """Just the read surface the service needs — lets fakes stand in for the repo."""

    async def unread_count(self, user_id: UUID) -> int: ...


class NotificationsService:
    def __init__(self, repo: NotificationsReader) -> None:
        self._repo = repo

    async def unread_count(self, caller_id: UUID) -> UnreadCountResponse:
        count = await self._repo.unread_count(caller_id)
        return UnreadCountResponse(unread_count=count)
