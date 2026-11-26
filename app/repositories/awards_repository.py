"""Repository for the /awards catalog read — SQL only, never HTTP errors.

The live definition mirrors ShowcaseRepository.live_awards exactly (0033,
no voting; the read ticks fn_awards_auto_phase first) so the two reads can
never disagree about what an award in the running cycle is.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AwardsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_live(self) -> list[dict[str, Any]]:
        """Every award in the running cycle, ranked by nearest close."""
        await self._session.execute(text("SELECT fn_awards_auto_phase()"))
        result = await self._session.execute(
            text(
                "SELECT a.id, a.name, a.description, a.cadence, "
                "       a.prize_points, a.max_nominations_per_nominator, "
                "       a.requires_jury, a.nominations_end, a.guidelines, "
                "       f.name AS period_name, f.starts AS period_start, f.ends AS period_end "
                "FROM awards a "
                "JOIN fiscal_period f ON f.id = a.period_id "
                "WHERE a.phase = 'nominations' "
                "   AND (a.nominations_start IS NULL OR a.nominations_start <= CURRENT_DATE) "
                "   AND (a.nominations_end IS NULL OR a.nominations_end >= CURRENT_DATE) "
                "ORDER BY a.nominations_end ASC NULLS LAST"
            ),
        )
        return [dict(row) for row in result.mappings().all()]
