"""Notifications badge service rules — repository stubbed; no DB needed.

The SQL-side invariant (unread = read_at IS NULL AND delivery_status in
('queued','sent')) is enforced by the query in NotificationsRepository —
including the schema's 0010 partial indexes; this unit test pins what the
SQL can not: the caller passes through as the answer's user scope.
"""

from uuid import uuid4

from app.services.notifications_service import NotificationsService


class FakeNotificationsRepository:
    def __init__(self, count: int) -> None:
        self._count = count
        self.requested_for: list[object] = []

    async def unread_count(self, user_id: object) -> int:
        self.requested_for.append(user_id)
        return self._count


async def test_unread_count_passes_actor_through_and_returns_count() -> None:
    actor_id = uuid4()
    repo = FakeNotificationsRepository(count=3)

    count = await NotificationsService(repo).unread_count(actor_id=actor_id)

    assert count == 3
    assert repo.requested_for == [actor_id]
