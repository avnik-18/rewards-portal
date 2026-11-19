"""Reads for /me and /me/stats — SQL only, no business rules, no HTTP errors."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class MeRepository:
    """One method per read; returns rows/dicts for the service layer."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def profile(self, actor_id: Any) -> dict[str, Any] | None:
        """users row + the caller's open portal role (RBAC groundwork).

        Role mapping is provisional while the role model is being finalized:
        admin -> 'admin', hr -> 'hr', and people who lead — an active team-lead
        row or active direct reports — map to 'leader'; the empty set (most
        employees) maps to 'individual' by design — the app_role enum only
        carries special roles, not the default individual.
        """
        result = await self._session.execute(
            text(
                "SELECT u.id, u.employee_code, u.full_name, u.email, "
                "u.title, u.department, "
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
                "    THEN 'leader' ELSE 'individual' END::text) AS role "
                "FROM users u WHERE u.id = :actor"
            ),
            dict(actor=actor_id),
        )
        row = result.mappings().first()
        return dict(row) if row is not None else None

    async def points_balance(self, actor_id: Any) -> int:
        """Wallet balance is a trigger-maintained cache — read it directly."""
        result = await self._session.execute(
            text("SELECT balance FROM points_wallet WHERE user_id = :actor"),
            dict(actor=actor_id),
        )
        value = result.scalar()
        return int(value) if value is not None else 0

    async def allowance(self, actor_id: Any) -> tuple[int, int] | None:
        """(balance, allocated) from the most recent period's allowance row."""
        result = await self._session.execute(
            text(
                "SELECT t.balance, t.allocated FROM to_recog_points t "
                "JOIN fiscal_period p ON p.id = t.period_id "
                "WHERE t.user_id = :actor ORDER BY p.starts DESC LIMIT 1"
            ),
            dict(actor=actor_id),
        )
        row = result.first()
        return (int(row[0]), int(row[1])) if row is not None else None

    async def recognitions_given(self, actor_id: Any) -> int:
        result = await self._session.execute(
            text(
                "SELECT count(*) FROM recognition_history WHERE from_user_id = :actor"
            ),
            dict(actor=actor_id),
        )
        return int(result.scalar_one())

    async def recognitions_received(self, actor_id: Any) -> int:
        result = await self._session.execute(
            text(
                "SELECT count(*) FROM recognition_recipients "
                "WHERE user_id = :actor AND kind = 'to'"
            ),
            dict(actor=actor_id),
        )
        return int(result.scalar_one())
