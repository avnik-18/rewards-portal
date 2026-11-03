"""Showcase + badge service rules — repositories stubbed; no DB needed.

Pins the contracts the SQL can not: date arithmetic has one seam (today),
prize sums count only live awards, jury flags pass through untouched, and the
badge count is a plain passthrough of the unread definition.
"""

from datetime import date
from uuid import uuid4

from app.schemas.showcase import JuryStatus, ShowcaseResponse
from app.services.notifications_service import NotificationsService
from app.services.showcase_service import ShowcaseService


class FakeShowcaseRepository:
    def __init__(
        self,
        rows: list[dict[str, object]],
        flags: dict[str, bool],
    ) -> None:
        self._rows = rows
        self._flags = flags

    async def live_awards(self) -> list[dict[str, object]]:
        return self._rows

    async def jury_flags(self, caller_id: object, award_ids: list[object]) -> dict[str, bool]:
        return self._flags


class FakeNotificationsRepository:
    def __init__(self, count: int) -> None:
        self._count = count
        self.requested_for: list[object] = []

    async def unread_count(self, user_id: object) -> int:
        self.requested_for.append(user_id)
        return self._count


async def test_days_to_close_uses_injected_today_nearest_future_end() -> None:
    repo = FakeShowcaseRepository(
        [
            dict(award_id=uuid4(), name="EoQ Nov",
                 nominations_end=date(2026, 11, 30), prize_points=5000),
            dict(award_id=uuid4(), name="EoQ Dec",
                 nominations_end=date(2026, 12, 15), prize_points=5000),
            dict(award_id=uuid4(), name="No close",
                 nominations_end=None, prize_points=2000),
        ],
        {"assigned": True, "cast": False},
    )

    response = await ShowcaseService(repo).showcase(caller_id=uuid4(), today=date(2026, 11, 20))

    assert response.days_to_nominations_close == 10
    assert response.open_categories == 3
    assert response.cycle_prize_total == 12000
    assert response.my_jury == JuryStatus(cast=False, assigned=True)


async def test_past_close_and_no_awards_return_empty_showcase() -> None:
    closed_rows = [
        dict(award_id=uuid4(), name="Closed",
             nominations_end=date(2026, 10, 1), prize_points=5000)
    ]
    repo = FakeShowcaseRepository(closed_rows, {"assigned": False, "cast": False})

    response = await ShowcaseService(repo).showcase(caller_id=uuid4(), today=date(2026, 11, 20))

    assert response.days_to_nominations_close is None
    assert response.open_categories == 1  # live_awards already filtered; service trusts the repo
    empty_repo = FakeShowcaseRepository([], {"assigned": False, "cast": False})
    empty = await ShowcaseService(empty_repo).showcase(caller_id=uuid4(), today=date(2026, 11, 20))
    assert empty == ShowcaseResponse(
        days_to_nominations_close=None,
        open_categories=0,
        cycle_prize_total=0,
        my_jury=JuryStatus(cast=False, assigned=False),
    )



async def test_unread_count_passes_caller_through_and_returns_count() -> None:
    caller_id = uuid4()
    repo = FakeNotificationsRepository(count=3)

    response = await NotificationsService(repo).unread_count(caller_id=caller_id)

    assert response.unread_count == 3
    assert repo.requested_for == [caller_id]
