"""Showcase service rules — repository stubbed; no DB needed (tests/unit style).

The SQL-side invariant (MAJOR 1+2: phase bound on both WHERE branches, so a
stale or cancelled award can never leak) is enforced by the query in
ShowcaseRepository; these unit tests pin what the SQL can not: the countdown
arithmetic only trusts future dates (near-future closes win even when a stale
row sneaks through the SQL), prize sums count only live awards, and the jury
flags pass through untouched.
"""

from datetime import date
from uuid import uuid4

from app.services.showcase_service import ShowcaseService


class FakeShowcaseRepository:
    def __init__(self, rows: list[dict[str, object]], flags: dict[str, bool]) -> None:
        self._rows = rows
        self._flags = flags

    async def live_awards(self) -> list[dict[str, object]]:
        return self._rows

    async def jury_flags(self, actor_id: object, award_ids: list[object]) -> dict[str, bool]:
        return self._flags


async def test_days_to_close_uses_injected_today_nearest_future_end() -> None:
    repo = FakeShowcaseRepository(
        [
            dict(award_id=uuid4(), name="EoQ Nov", nominations_end=date(2026, 11, 30), prize_points=5000),
            dict(award_id=uuid4(), name="EoQ Dec", nominations_end=date(2026, 12, 15), prize_points=5000),
            dict(award_id=uuid4(), name="No close", nominations_end=None, prize_points=2000),
        ],
        {"assigned": True, "cast": False},
    )

    numbers = await ShowcaseService(repo).showcase_numbers(actor_id=uuid4(), today=date(2026, 11, 20))

    assert numbers["days_to_nominations_close"] == 10
    assert numbers["open_categories"] == 3
    assert numbers["cycle_prize_total"] == 12000
    assert numbers["my_jury"] == {"assigned": True, "cast": False}


async def test_stale_past_close_never_wins_the_countdown() -> None:
    """MAJOR 1's guard: a past-dated row reaching the service (SQL bypassed by
    this fake on purpose) must not clamp the real nearer close to None."""
    repo = FakeShowcaseRepository(
        [
            dict(award_id=uuid4(), name="Stale", nominations_end=date(2026, 10, 1), prize_points=5000),
            dict(award_id=uuid4(), name="Live", nominations_end=date(2026, 11, 30), prize_points=5000),
        ],
        {"assigned": False, "cast": False},
    )

    numbers = await ShowcaseService(repo).showcase_numbers(actor_id=uuid4(), today=date(2026, 11, 20))

    assert numbers["days_to_nominations_close"] == 10


async def test_past_close_and_no_awards_return_empty_showcase() -> None:
    closed_repo = FakeShowcaseRepository(
        [dict(award_id=uuid4(), name="Closed Evaluations", nominations_end=date(2026, 10, 1), prize_points=5000)],
        {"assigned": False, "cast": False},
    )

    numbers = await ShowcaseService(closed_repo).showcase_numbers(actor_id=uuid4(), today=date(2026, 11, 20))

    assert numbers["days_to_nominations_close"] is None
    assert numbers["open_categories"] == 1  # live_awards is repo-filtered; the service trusts the repo
    empty = await ShowcaseService(FakeShowcaseRepository([], {"assigned": False, "cast": False})).showcase_numbers(
        actor_id=uuid4(), today=date(2026, 11, 20)
    )
    assert empty == {
        "days_to_nominations_close": None,
        "open_categories": 0,
        "cycle_prize_total": 0,
        "my_jury": {"assigned": False, "cast": False},
    }
