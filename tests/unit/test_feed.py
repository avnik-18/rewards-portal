"""Feed service rules — repository stubbed; no DB needed.

The SQL-side invariants (persona segmentation, tier ordering BU → own →
team → related, keyset filtering) are enforced by the query itself in
FeedRepository; these unit tests pin the service contracts the SQL can not:
the actor pass-through, the cursor filters handed to the repository, the
next-cursor derivation from the last row, and row passthrough.
"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.schemas.feed import FeedCursor
from app.services.feed_service import FeedService


class FakeFeedRepository:
    """Matches FeedRepository.page's contract: raw rows after the keyset cursor."""

    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows
        self.viewer_ids: list[object] = []
        self.limits: list[int] = []
        self.cursors: list[dict[str, object] | None] = []

    async def page(self, viewer_id: object, limit: int, cursor: dict[str, object] | None) -> list[dict[str, object]]:
        self.viewer_ids.append(viewer_id)
        self.limits.append(limit)
        self.cursors.append(cursor)
        return self._rows[:limit]

    async def persona(self, viewer_id: object) -> str:
        self.viewer_ids.append(viewer_id)
        return "admin"


async def test_persona_passes_repository_value_through_unchanged() -> None:
    repo = FakeFeedRepository([])
    viewer = uuid4()

    persona = await FeedService(repo).persona(viewer)

    assert persona == "admin"
    assert repo.viewer_ids == [viewer]


async def test_feed_page_forwards_actor_limit_and_cursor_keys() -> None:
    rows = [_feed_row(tier="bu", occurred_at=datetime.now(UTC)) for _ in range(3)]
    repo = FakeFeedRepository(rows)
    viewer = uuid4()
    cursor_at = datetime(2026, 11, 18, 9, 30, tzinfo=UTC)
    cursor_id = uuid4()
    cursor = FeedCursor(tier="own", occurred_at=cursor_at, recognition_id=cursor_id)

    _, _ = await FeedService(repo).feed_page(viewer, 3, cursor)

    assert repo.viewer_ids == [viewer]
    assert repo.limits == [3]
    assert repo.cursors == [
        dict(
            cursor_tier="own",
            cursor_at=cursor_at,
            cursor_recognition_id=cursor_id,
        )
    ]


async def test_feed_page_passes_none_not_dict_when_cursor_absent() -> None:
    repo = FakeFeedRepository(
        [
            _feed_row(tier="bu", occurred_at=datetime.now(UTC)),
        ]
    )

    _, _ = await FeedService(repo).feed_page(uuid4(), 2, None)

    assert repo.cursors == [None]


async def test_next_cursor_is_none_when_page_shorter_than_limit() -> None:
    rows = [
        _feed_row(tier="bu", occurred_at=datetime(2026, 11, 18, 10, tzinfo=UTC)),
        _feed_row(tier="own", occurred_at=datetime(2026, 11, 18, 9, tzinfo=UTC)),
    ]
    repo = FakeFeedRepository(rows)

    _, next_cursor = await FeedService(repo).feed_page(uuid4(), 5, None)

    assert next_cursor is None


async def test_next_cursor_built_from_last_row_when_page_fills_limit() -> None:
    cursor_at = datetime(2026, 11, 18, 8, 15, tzinfo=UTC)
    cursor_id = uuid4()
    rows = [
        _feed_row(tier="bu", occurred_at=datetime(2026, 11, 18, 10, tzinfo=UTC)),
        _feed_row(tier="team", occurred_at=cursor_at, recognition_id=cursor_id),
    ]
    repo = FakeFeedRepository(rows)

    _, next_cursor = await FeedService(repo).feed_page(uuid4(), 2, None)

    assert next_cursor == FeedCursor(tier="team", occurred_at=cursor_at, recognition_id=cursor_id)


async def test_rows_pass_through_untouched() -> None:
    occurred_at = datetime(2026, 11, 18, 12, tzinfo=UTC)
    recognition_id = uuid4()
    recipients = [dict(user_id=uuid4(), name="A", points=50, kind="direct")]
    row = dict(
        recognition_id=recognition_id,
        tier="bu",
        occurred_at=occurred_at,
        giver_id=uuid4(),
        giver_name="Giver",
        giver_avatar=None,
        kind="praise",
        message="Great work",
        points=100,
        value_label=None,
        recipients=recipients,
    )
    repo = FakeFeedRepository([row])

    entries, _ = await FeedService(repo).feed_page(uuid4(), 1, None)

    assert entries == [row]


def _feed_row(
    tier: str,
    occurred_at: datetime,
    recognition_id: UUID | None = None,
) -> dict[str, object]:
    row_id = recognition_id if recognition_id is not None else uuid4()
    return dict(
        recognition_id=row_id,
        tier=tier,
        occurred_at=occurred_at,
        giver_id=uuid4(),
        giver_name="Giver",
        giver_avatar=None,
        kind="praise",
        message="Nice",
        points=10,
        value_label=None,
        recipients=[],
    )
