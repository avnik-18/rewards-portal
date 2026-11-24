"""Awards catalog — service rules for the /awards list.

The repository already filters to the live collection and ranks by close
date; this layer normalizes raw rows into DTOs (quota, guideline sections,
cadence) so the HTTP layer never reshapes storage.
"""

from typing import Any
from uuid import UUID

from app.repositories.awards_repository import AwardsRepository
from app.schemas.awards import AwardGuideline, AwardItem


class AwardsService:
    def __init__(self, repository: AwardsRepository) -> None:
        self._repo = repository

    async def list_awards(self) -> list[AwardItem]:
        rows = await self._repo.list_live()
        return [self._to_item(row) for row in rows]

    def _to_item(self, row: dict[str, Any]) -> AwardItem:
        raw_guidelines = row.get("guidelines") or []
        return AwardItem(
            id=UUID(str(row["id"])),
            name=str(row["name"]),
            description=row.get("description"),
            cadence=str(row["cadence"]),  # PG enum constrains the values to the Cadence literals
            period_name=str(row["period_name"]),
            period_start=row["period_start"],
            period_end=row["period_end"],
            nominations_end=row.get("nominations_end"),
            prize_points=int(row["prize_points"]),
            nomination_quota=int(row["max_nominations_per_nominator"]),
            requires_jury=bool(row["requires_jury"]),
            guidelines=[
                AwardGuideline(
                    title=str(section.get("title", "")),
                    lines=[str(line) for line in section.get("lines", [])],
                )
                for section in raw_guidelines
                if isinstance(section, dict)
            ],
        )
