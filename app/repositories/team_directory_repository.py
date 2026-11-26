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
           (SELECT e.key
              FROM recognition_recipients rr
              JOIN recognition_history rh ON rh.id = rr.recognition_id
               AND rh.status = 'approved' AND rh.value_id IS NOT NULL
              JOIN emids_values e ON e.id = rh.value_id
             WHERE rr.user_id = tm.user_id AND rr.kind = 'to'
             GROUP BY e.key ORDER BY count(*) DESC LIMIT 1) AS top_value
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

    async def org_tree(self, viewer_id: UUID) -> dict[str, Any]:
        """The Recognition Tree's subtree under the caller: everyone
        reporting to them (to two levels below) when they manage people,
        their lane teams' roster otherwise — the admin sees all teams.
        Points follow the team leaderboard's source: lifetime award-wins."""
        pts_sql = (
            "SELECT coalesce(sum(rr.points), 0) AS pts "
            "FROM recognition_recipients rr "
            "JOIN recognition_history rh ON rh.id = rr.recognition_id "
            "WHERE rr.user_id = :uid AND rr.kind = 'to' "
            "AND rh.kind = 'award' AND rh.status = 'approved'"
        )
        lane_sql = (
            "SELECT t.name AS team_name FROM teams t "
            "LEFT JOIN team_members m ON m.team_id = t.id AND m.valid_to IS NULL "
            "WHERE m.user_id = :uid OR t.dm_id = :uid OR t.dh_id = :uid "
            "ORDER BY t.name LIMIT 1"
        )

        async def detail(uid: str) -> dict[str, Any]:
            lane = await self._session.execute(text(lane_sql), dict(uid=uid))
            lane_row = lane.first()
            row_pts = await self._session.execute(text(pts_sql), dict(uid=uid))
            row = await self._session.execute(
                text("SELECT full_name, title FROM users WHERE id = :uid"), dict(uid=uid))
            user = row.first()
            return dict(
                id=uid,
                name=str(user.full_name) if user else "—",
                title=str(user.title) if user and user.title else "",
                teamId=str(lane_row.team_name) if lane_row and lane_row.team_name else "",
                teamName=str(lane_row.team_name) if lane_row and lane_row.team_name else "",
                pts=int(row_pts.scalar() or 0),
            )

        me = await detail(str(viewer_id))
        me["pts"] = me["pts"]

        reports = await self._session.execute(
            text(
                "WITH RECURSIVE sub(id, depth) AS ("
                "  SELECT CAST(:uid AS uuid), 0"
                "  UNION ALL"
                "  SELECT u.id, s.depth + 1 FROM users u"
                "  JOIN sub s ON u.manager_id = s.id"
                "  WHERE s.depth < 2 AND u.employment_status = 'active'"
                ")"
                "SELECT id::text FROM sub WHERE id <> :uid ORDER BY id"
            ),
            dict(uid=str(viewer_id)),
        )
        report_ids = [r[0] for r in reports.all()]

        admin = await self._session.execute(
            text("SELECT fn_persona(:uid)::text = 'admin'"), dict(uid=str(viewer_id)))
        is_admin = bool(admin.scalar())

        if not report_ids and not is_admin:
            # no reports: the member's own lane team peers stand in as the tree
            peers = await self._session.execute(
                text(
                    "SELECT tm.user_id::text FROM team_members tm"
                    " WHERE tm.valid_to IS NULL"
                    "   AND tm.user_id <> :uid AND tm.team_id IN ("
                    "    SELECT team_id FROM team_members WHERE user_id = :uid AND valid_to IS NULL)"
                ),
                dict(uid=str(viewer_id)),
            )
            report_ids = [r[0] for r in peers.all()]
            if not report_ids:
                # no team either: fall back to the teams the caller leads
                leads = await self._session.execute(
                    text(
                        "SELECT tm.user_id::text FROM team_members tm"
                        " WHERE tm.valid_to IS NULL AND tm.user_id <> :uid"
                        "   AND tm.team_id IN (SELECT id FROM teams WHERE dm_id = :uid OR dh_id = :uid)"
                    ),
                    dict(uid=str(viewer_id)),
                )
                report_ids = [r[0] for r in leads.all()]
        elif is_admin and not report_ids:
            all_peers = await self._session.execute(
                text(
                    "SELECT tm.user_id::text FROM team_members tm"
                    " WHERE tm.valid_to IS NULL AND tm.user_id <> :uid"
                ),
                dict(uid=str(viewer_id)),
            )
            report_ids = [r[0] for r in all_peers.all()]

        members = []
        for uid in report_ids:
            members.append(await detail(uid))
        return {"me": me, "members": members}
