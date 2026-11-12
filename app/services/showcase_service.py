"""Showcase adapter — thin above ShowcaseRepository.

Date arithmetic happens here (single today seam → testable): the repository's
WHERE clause already excludes stale/closed awards (phase bound on both
branches), so every nominations_end that reaches this code is either NULL or
>= today — the countdown filters future dates BEFORE the min() as a second
line of defence, so a mixed-past/list future can never clamp the real
nearest close to None (Shourya's MAJOR 1 + 2). Returns raw rows; the router
builds ShowcaseResponse.
"""

from datetime import date
from typing import Any
from uuid import UUID

from app.repositories.showcase_repository import ShowcaseRepository


class ShowcaseService:
    def __init__(self, repo: ShowcaseRepository) -> None:
        self._repo = repo

    async def showcase_numbers(self, actor_id: UUID, today: date | None = None) -> dict[str, Any]:
        today = today or date.today()
        awards = await self._repo.live_awards()

        open_categories = len(awards)
        cycle_prize_total = sum(award["prize_points"] for award in awards)
        close_dates = [
            award["nominations_end"]
            for award in awards
            if award["nominations_end"] is not None and award["nominations_end"] >= today
        ]
        days_to_close = min((close - today).days for close in close_dates) if close_dates else None

        jury_flags = await self._repo.jury_flags(actor_id, [award["award_id"] for award in awards])
        return {
            "days_to_nominations_close": days_to_close,
            "open_categories": open_categories,
            "cycle_prize_total": cycle_prize_total,
            "my_jury": jury_flags,
        }
