"""Leaderboard service rules — repository stubbed; no DB needed.

The SQL-side invariants (award-only kind='award' scoring, approved-only,
rank() over ties with the name tiebreaker, TEAM-scoped candidate pool) are
enforced by the query itself in LeaderboardRepository; these unit tests pin
the service contracts the SQL can not: the actor pass-through (the team pool
depends on the caller), row passthrough, ordering and the limit.
"""

from uuid import uuid4

from app.services.leaderboard_service import LeaderboardService


class FakeLeaderboardRepository:
    """Matches LeaderboardRepository.top_receivers' contract: raw rows, best first."""

    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows
        self.limits: list[int] = []
        self.actor_ids: list[object] = []

    async def top_receivers(self, actor_id: object, limit: int) -> list[dict[str, object]]:
        self.actor_ids.append(actor_id)
        self.limits.append(limit)
        return self._rows[:limit]


async def test_rows_pass_through_with_rank_points_and_order_untouched() -> None:
    rows = [
        dict(user_id=uuid4(), name="A", points=500, rank=1),
        dict(user_id=uuid4(), name="B", points=40, rank=2),
    ]
    repo = FakeLeaderboardRepository(rows)

    entries = await LeaderboardService(repo).top(actor_id=uuid4(), limit=5)

    assert [(row["rank"], row["points"], row["name"]) for row in entries] == [(1, 500, "A"), (2, 40, "B")]


async def test_limit_and_actor_forward_to_repository() -> None:
    rows = [dict(user_id=uuid4(), name=f"P{index}", points=100 - index, rank=index) for index in range(1, 11)]
    repo = FakeLeaderboardRepository(rows)
    caller = uuid4()

    entries = await LeaderboardService(repo).top(actor_id=caller, limit=3)

    assert repo.limits == [3]
    assert repo.actor_ids == [caller]
    assert len(entries) == 3


async def test_empty_quarter_returns_empty_rows() -> None:
    repo = FakeLeaderboardRepository([])

    entries = await LeaderboardService(repo).top(actor_id=uuid4(), limit=5)

    assert entries == []
