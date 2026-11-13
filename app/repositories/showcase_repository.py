"""Repository for the awards showcase — SQL only, never HTTP errors.

The "live cycle" definition lives in the WHERE clause and binds the phase on
BOTH branches: an award is part of the running collection only while its
phase is `nominations`/`voting` (end date still present or still in the
future), or `draft` with a future nominations end. A past/cancelled award
with a stale future end date can never leak back in, and neither can a draft
with a pre-set date unless it is still ahead of today. Closed/cancelled
awards never appear.
"""

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ShowcaseRepository:
    """Showcase pattern methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def live_awards(self) -> list[dict[str, Any]]:
        """Rows of every award in the live collection with its close date."""
        result = await self._session.execute(
            text(
                "SELECT a.id, a.name, a.nominations_end, a.prize_points "
                "FROM awards a "
                "WHERE (a.phase IN ('nominations', 'voting') "
                "         AND (a.nominations_end IS NULL OR a.nominations_end >= CURRENT_DATE)) "
                "   OR (a.phase = 'draft' AND a.nominations_end >= CURRENT_DATE)"
            ),
        )
        return [
            dict(
                award_id=row["id"],
                name=row["name"],
                nominations_end=row["nominations_end"],
                prize_points=row["prize_points"],
            )
            for row in result.mappings().all()
        ]

    async def jury_flags(self, actor_id: UUID, award_ids: list[UUID]) -> dict[str, bool]:
        """assigned = actor sits on a jury of these awards; cast = already voted."""
        if not award_ids:
            return {"assigned": False, "cast": False}
        award_keys = [str(award) for award in award_ids]
        result = await self._session.execute(
            text(
                "SELECT "
                "  COALESCE((SELECT true FROM jury_assignment ja "
                "     WHERE ja.user_id = :actor_id "
                "       AND ja.award_id = ANY(:award_ids)), false) AS assigned, "
                "  COALESCE((SELECT true FROM ballot b "
                "       JOIN awards_nominations an ON an.id = b.nomination_id "
                "     WHERE b.juror_id = :actor_id "
                "       AND an.award_id = ANY(:award_ids)), false) AS cast"
            ),
            dict(actor_id=actor_id, award_ids=award_keys),
        )
        row = result.mappings().one()
        return {"assigned": row["assigned"], "cast": row["cast"]}
