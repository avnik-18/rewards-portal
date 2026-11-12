"""Repository for the dashboard leaderboard — SQL only, never HTTP errors.

Counts peer points RECEIVED from approved recognitions this calendar quarter
(the same table the allowances domain quantizes by fiscal_period; the quarter
here is the stat-tile contract, evaluated in the server time zone — keep this
assumption visible when the fiscal-period anchor lands). Exclusions come for
free — EoQ prize payouts and allowance/system grant credits only ever touch
the ledger, never recognition_recipients, so they can never appear here.

Equal points share the same rank (rank(), not row_number()) and the output is
ordered deterministically (points DESC, then full_name) so ties can't swap
places between page loads. Keep both invariants when touching this SQL.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class LeaderboardRepository:
    """Leaderboard pattern methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def top_receivers(self, limit: int) -> list[dict[str, Any]]:
        """Top peer-point receivers, best first, capped at limit."""
        result = await self._session.execute(
            text(
                "WITH scored AS ("
                "  SELECT u.id, u.full_name, SUM(rr.points)::int AS points"
                "  FROM recognition_recipients rr"
                "  JOIN recognition_history rh ON rh.id = rr.recognition_id"
                "    AND rh.status = 'approved'"
                "    AND rh.occurred_at >= date_trunc('quarter', now())"
                "  JOIN users u ON u.id = rr.user_id"
                "  WHERE rr.kind = 'to'"
                "  GROUP BY u.id, u.full_name"
                ")"
                "SELECT id, full_name, points, "
                "       rank() OVER (ORDER BY points DESC) AS rank "
                "FROM scored ORDER BY points DESC, full_name LIMIT :limit"
            ),
            dict(limit=limit),
        )
        return [
            dict(user_id=row["id"], name=row["full_name"], points=row["points"], rank=row["rank"])
            for row in result.mappings().all()
        ]
