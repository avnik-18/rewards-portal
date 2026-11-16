"""Repository for the dashboard leaderboard — SQL only, never HTTP errors.

GROUP-SCOPED reading (feature/leaderboard-teams): the caller only sees the
board of the team(s) they belong to. Three groups (6/5/3) seeded in
team_members drive the candidate pool; members with zero received points
appear with 0 pts (LEFT JOIN), so a fresh team shows its whole roster.

- Caller in no team at all → org-wide fallback that keeps the pre-teams
  semantic: this quarter's receivers plus the caller themselves (an unscoped
  org roster would wall-of-zeros the card for people like E-BR who sit in no
  team yet).
- Allowance/EoQ/system credits still never appear (ledger-only rows).
- Equal points share the same rank (rank(), not row_number()) and the order
  is deterministic (points DESC, then full_name). Keep both invariants.
- The recipient-side quarter/year scoping stays the same; the caller is
  always an implicit candidate even with zero gifts.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class LeaderboardRepository:
    """Leaderboard pattern methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def top_receivers(self, actor_id: Any, limit: int) -> list[dict[str, Any]]:
        """Top peer-point receivers, best first, scoped to the caller's teams."""
        result = await self._session.execute(
            text(
                "WITH my_teams AS ("
                "  SELECT tm.team_id"
                "  FROM team_members tm"
                "  WHERE tm.user_id = :actor_id AND tm.valid_to IS NULL"
                "),"
                "candidates AS ("
                "  SELECT tm.user_id FROM team_members tm"
                "  WHERE tm.team_id IN (SELECT team_id FROM my_teams)"
                "    AND tm.valid_to IS NULL"
                "  UNION SELECT :actor_id"
                "),"
                "scored AS ("
                "  SELECT u.id, u.full_name,"
                "         COALESCE(SUM(CASE WHEN rh.id IS NOT NULL THEN rr.points END), 0)::int AS points"
                "  FROM users u"
                "  LEFT JOIN recognition_recipients rr"
                "    ON rr.user_id = u.id AND rr.kind = 'to'"
                "  LEFT JOIN recognition_history rh"
                "    ON rh.id = rr.recognition_id AND rh.status = 'approved'"
                "    AND rh.occurred_at >= date_trunc('quarter', now())"
                "  WHERE u.id IN (SELECT user_id FROM candidates)"
                "     OR ( (SELECT count(*) FROM my_teams) = 0"
                "          AND ( u.id = :actor_id"
                "                OR EXISTS (SELECT 1 FROM recognition_recipients rr2"
                "                   JOIN recognition_history rh2 ON rh2.id = rr2.recognition_id"
                "                    AND rh2.status = 'approved'"
                "                    AND rh2.occurred_at >= date_trunc('quarter', now())"
                "                   WHERE rr2.user_id = u.id AND rr2.kind = 'to') ) )"
                "  GROUP BY u.id, u.full_name"
                ")"
                "SELECT id, full_name, points, "
                "       rank() OVER (ORDER BY points DESC) AS rank "
                "FROM scored ORDER BY points DESC, full_name LIMIT :limit"
            ),
            dict(actor_id=actor_id, limit=limit),
        )
        return [
            dict(user_id=row["id"], name=row["full_name"], points=row["points"], rank=row["rank"])
            for row in result.mappings().all()
        ]
