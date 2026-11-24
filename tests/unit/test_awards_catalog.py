"""Awards catalog service — repository stubbed; no DB needed (tests/unit style).

Pins the row→DTO shape the /awards endpoint relies on: quota and jury flags
pass through, the admin-authored guideline sections land as {title, lines}
pairs, and missing/null guidelines degrade to an empty list rather than None
(the React Guidelines modal never renders undefined rows).
"""

from datetime import date
from uuid import uuid4

from app.services.awards_service import AwardsService


class FakeAwardsRepository:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows

    async def list_live(self) -> list[dict[str, object]]:
        return self._rows


async def test_rows_map_to_items_with_quota_and_guidelines() -> None:
    award_id = uuid4()
    repo = FakeAwardsRepository(
        [
            dict(
                id=award_id,
                name="Super Squad",
                description="Teams of five or more, together.",
                cadence="annual",
                prize_points=10000,
                max_nominations_per_nominator=8,
                requires_jury=True,
                nominations_end=date(2026, 12, 16),
                period_name="FY27",
                period_start=date(2027, 1, 1),
                period_end=date(2027, 12, 31),
                guidelines=[
                    {"title": "Eligibility", "lines": ["Teams with 5 or more team members"]},
                    {"title": "Applicability", "lines": ["Delivery", "Sales"]},
                ],
            ),
        ],
    )
    item = (await AwardsService(repo).list_awards())[0]

    assert item.id == award_id
    assert item.cadence == "annual"
    assert item.nomination_quota == 8
    assert item.requires_jury is True
    assert item.prize_points == 10000
    assert item.period_name == "FY27"
    assert [(section.title, section.lines) for section in item.guidelines] == [
        ("Eligibility", ["Teams with 5 or more team members"]),
        ("Applicability", ["Delivery", "Sales"]),
    ]


async def test_null_guidelines_become_empty_list_and_defaults_pass_through() -> None:
    repo = FakeAwardsRepository(
        [
            dict(
                id=uuid4(),
                name="Pat on the Back",
                description=None,
                cadence="quarterly",
                prize_points=2500,
                max_nominations_per_nominator=1,
                requires_jury=False,
                nominations_end=date(2026, 11, 28),
                period_name="FY26 Q4",
                period_start=date(2026, 10, 1),
                period_end=date(2026, 12, 31),
                guidelines=None,
            ),
        ],
    )
    item = (await AwardsService(repo).list_awards())[0]

    assert item.guidelines == []
    assert item.description is None
    assert item.nomination_quota == 1
    assert item.requires_jury is False
