"""Reads for the demo-identity dropdown — SQL only, no business rules."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class DemoUsersRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[dict[str, Any]]:
        """The seeded directory: code, name, title (designation), department,
        plus each user's portal role and persona so the login screen can
        group the dropdown by role (admins / leaders / employees).

        Readable WITHOUT any identity header — the login screen has no actor
        yet; it is where one gets picked. Name-ordered so the dropdown is
        stable regardless of seed insertion order.
        """
        result = await self._session.execute(text(
            "SELECT employee_code, full_name, title, department, "
            "COALESCE((SELECT CASE r.role WHEN 'admin' THEN 'admin' "
            "WHEN 'hr' THEN 'hr' END::text "
            "FROM role_assignment r WHERE r.user_id = u.id AND r.revoked_at IS NULL "
            "ORDER BY CASE r.role WHEN 'admin' THEN 0 WHEN 'hr' THEN 1 ELSE 2 END "
            "LIMIT 1), "
            "CASE WHEN EXISTS (SELECT 1 FROM team_members tm"
            "          WHERE tm.user_id = u.id AND tm.valid_to IS NULL"
            "          AND tm.role = 'lead') "
            "       OR EXISTS (SELECT 1 FROM users x"
            "          WHERE x.manager_id = u.id AND x.employment_status = 'active')"
            "    THEN 'leader' ELSE 'individual' END::text) AS role, "
            "fn_persona(u.id)::text AS persona "
            "FROM users u ORDER BY full_name"))
        return [dict(row) for row in result.mappings().all()]
