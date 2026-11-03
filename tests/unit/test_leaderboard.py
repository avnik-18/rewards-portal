"""Leaderboard service rules — repository stubbed; no DB needed (api/CLAUDE.md).

The SQL-side invariants (pending excluded, ledger-only credits excluded) are
enforced by the query itself in LeaderboardRepository; these unit tests pin
the service contracts the SQL can not: identity, ordering, limit, empty state.
"""

from uuid import uuid4

from app.schemas.leaderboard import LeaderboardResponse
from app.services.leaderboard_service import LeaderboardService


class FakeLeaderboardRepository:
    """Matches LeaderboardRepository.top_receivers' contract: raw rows, best first."""

    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows
        self.limits: list[int] = []

    async def top_receivers(self, limit: int) -> list[dict[str, object]]:
        self.limits.append(limit)
        return self._rows[:limit]


async def test_caller_or_not_marks_is_me() -> None:
    caller_id = uuid4()
    other_id = uuid4()
    repo = FakeLeaderboardRepository(
        [
            dict(userId=caller_id, name="Caller Person", points=380, rank=1),
            dict(userId=other_id, name="Other Person", points=250, rank=2),
        ]
    )
    response = await LeaderboardService(repo).top(caller_id=caller_id, limit=5)

    assert [entry.is_me for entry in response.entries] == [True, False]


async def test_rank_points_and_order_pass_through_untouched() -> None:
    repo = FakeLeaderboardRepository(
        [
            dict(userId=uuid4(), name="A", points=500, rank=1),
            dict(userId=uuid4(), name="B", points=40, rank=2),
        ]
    )
    response = await LeaderboardService(repo).top(caller_id=uuid4(), limit=5)

    assert [(e.rank, e.points, e.name) for e in response.entries] == [(1, 500, "A"), (2, 40, "B")]


async def test_limit_forwards_to_repository() -> None:
    rows = [
        dict(userId=uuid4(), name=f"P{index}", points=100 - index, rank=index)
        for index in range(1, 11)
    ]
    repo = FakeLeaderboardRepository(rows)

    response = await LeaderboardService(repo).top(caller_id=uuid4(), limit=3)

    assert repo.limits == [3]
    assert len(response.entries) == 3


async def test_empty_quarter_returns_empty_entries() -> None:
    repo = FakeLeaderboardRepository([])

    response = await LeaderboardService(repo).top(caller_id=uuid4(), limit=5)

    assert response == LeaderboardResponse(entries=[])
