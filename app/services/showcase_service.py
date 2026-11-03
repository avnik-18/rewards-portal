"""Showcase business rules — thin above ShowcaseRepository.

Do the date arithmetic in code (single today seam → testable); the repository
stays SQL-only.EXPOSES three numbers plus the caller's jury flags.
"""

from datetime import date
from typing import Any, Protocol, cast
from uuid import UUID

from app.schemas.showcase import JuryStatus, ShowcaseResponse


class ShowcaseReader(Protocol):
    """Just the read surface the service needs — lets fakes stand in for the repo."""

    async def live_awards(self) -> list[dict[str, Any]]: ...

    async def jury_flags(self, caller_id: UUID, award_ids: list[UUID]) -> dict[str, bool]: ...


class ShowcaseService:
    def __init__(self, repo: ShowcaseReader) -> None:
        self._repo = repo

    async def showcase(self, caller_id: UUID, today: date | None = None) -> ShowcaseResponse:
        today = today or date.today()
        awards: list[dict[str, Any]] = await self._repo.live_awards()

        open_categories = len(awards)
        cycle_prize_total = sum(award["prize_points"] for award in awards)
        close_dates = [
            cast(date, award["nominations_end"])
            for award in awards
            if award["nominations_end"] is not None
        ]
        days_to_close = min((close - today).days for close in close_dates) if close_dates else None
        if days_to_close is not None and days_to_close < 0:
            days_to_close = None  # closes in the past are no longer "days to close"

        jury_flags = await self._repo.jury_flags(caller_id, [award["award_id"] for award in awards])
        return ShowcaseResponse(
            days_to_nominations_close=days_to_close,
            open_categories=open_categories,
            cycle_prize_total=cycle_prize_total,
            my_jury=JuryStatus(cast=jury_flags["cast"], assigned=jury_flags["assigned"]),
        )
