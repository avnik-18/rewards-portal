"""Repository for the dashboard leaderboard — SQL only, never HTTP errors.

Proven SQL (docs/api-contract.md Table 3, verified against the live DB via
lb-demo.sql): counts peer points RECEIVED from approved recognitions this
quarter. Exclusions come for free — EoQ prize payouts and allowance/system
grant credits only ever touch the ledger, never recognition_recipients, so
they can never appear here. Keep both invariants when touching this SQL.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class LeaderboardRepository:
    """Leaderboard pattern methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def top_receivers(self, limit: int) -> list[dict[str, Any]]:
        """Peer points received this quarter, best first, capped at limit."""
        result = await self._session.execute(
            text(
                "WITH rows AS ("
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
                "       row_number() OVER (ORDER BY points DESC) AS rank "
                "FROM rows ORDER BY points DESC LIMIT :limit"
            ),
            dict(limit=limit),
        )
        return [
            dict(userId=row["id"], name=row["full_name"], points=row["points"], rank=row["rank"])
            for row in result.mappings().all()
        ]
