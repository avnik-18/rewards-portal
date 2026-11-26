"""Repository for the dashboard leaderboard — SQL only, never HTTP errors.

AWARD-ONLY scoring: the board counts award win points (recognition_history
kind='award' recipient points = the award's prize_points) and nothing else —
peer cheers and welcome/anniversary gift rows never enter the sum even if a
future rule starts granting points again.

GROUP-SCOPED reading (feature/leaderboard-teams): the caller only sees the
board of the team(s) they belong to. Candidates come from team_members;
members with zero award points appear with 0 pts (LEFT JOIN), so a fresh
team shows its whole roster. Wins are NOT quarter-scoped — an award is a
cumulative honour.

- Caller in no team at all → org-wide fallback: award receivers plus the
  caller themselves (an unscoped org roster would wall-of-zeros the card
  for people who sit in no team yet).
- Equal points share the same rank (rank(), not row_number()) and the order
  is deterministic (points DESC, then full_name). Keep both invariants.
- The caller is always an implicit candidate even with zero wins.
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
                "    AND rh.kind = 'award'"
                "  WHERE u.id IN (SELECT user_id FROM candidates)"
                "     OR ( (SELECT count(*) FROM my_teams) = 0"
                "          AND ( u.id = :actor_id"
                "                OR EXISTS (SELECT 1 FROM recognition_recipients rr2"
                "                   JOIN recognition_history rh2 ON rh2.id = rr2.recognition_id"
                "                    AND rh2.status = 'approved' AND rh2.kind = 'award'"
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
