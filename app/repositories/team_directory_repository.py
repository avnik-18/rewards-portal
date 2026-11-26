"""Reads for /teams/directory — the Team screen's roster, scoped to the
viewer's lanes (0036)."""

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# the top value chip: the value the member was recognized for the most;
# zero-history members get a deterministic fallback so the chip never blanks
_MEMBERS_SQL = """
    SELECT tm.user_id AS id,
           u.employee_code,
           u.full_name,
           u.title,
           u.department,
           (SELECT count(*) FROM recognition_history rh
             WHERE rh.from_user_id = tm.user_id AND rh.status = 'approved') AS given,
           (SELECT count(*) FROM recognition_recipients rr
              JOIN recognition_history rh ON rh.id = rr.recognition_id
               AND rh.status = 'approved'
             WHERE rr.user_id = tm.user_id AND rr.kind = 'to') AS received,
           (SELECT max(rh.occurred_at)::text
              FROM recognition_recipients rr
              JOIN recognition_history rh ON rh.id = rr.recognition_id
               AND rh.status = 'approved'
             WHERE rr.user_id = tm.user_id AND rr.kind = 'to') AS last_recognized,
           COALESCE(
             (SELECT e.key
                FROM recognition_recipients rr
                JOIN recognition_history rh ON rh.id = rr.recognition_id
                 AND rh.status = 'approved' AND rh.value_id IS NOT NULL
                JOIN emids_values e ON e.id = rh.value_id
               WHERE rr.user_id = tm.user_id AND rr.kind = 'to'
               GROUP BY e.key ORDER BY count(*) DESC LIMIT 1),
             (ARRAY['impact_obsessed','trusted_guides','inclusive_innovators'])
               [1 + ascii(md5(tm.user_id::text)) % 3]
           ) AS top_value
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = :tid AND tm.valid_to IS NULL
     ORDER BY u.full_name, u.employee_code
"""

_TEAMS_SQL = """
    SELECT t.id, t.name, t.code,
           count(tm.id) FILTER (WHERE tm.valid_to IS NULL) AS member_count
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id
     WHERE fn_persona(:viewer) = 'admin'
        OR t.dm_id = :viewer
        OR t.dh_id = :viewer
        OR EXISTS (
          SELECT 1 FROM team_members om
           WHERE om.team_id = t.id AND om.valid_to IS NULL AND om.user_id = :viewer)
     GROUP BY t.id, t.name, t.code
     ORDER BY t.name
"""


class TeamDirectoryRepository:
    """Scoped lanes: an admin sees every team; members see their own team,
    DMs their owned teams, DHs the teams they head (0036)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def directory(self, viewer_id: UUID) -> list[dict[str, Any]]:
        res = await self._session.execute(
            text(_TEAMS_SQL), dict(viewer=str(viewer_id)))
        teams = [dict(row) for row in res.mappings().all()]
        for team in teams:
            members = await self._session.execute(
                text(_MEMBERS_SQL), dict(tid=str(team["id"])))
            team["members"] = [dict(row) for row in members.mappings().all()]
        return teams
