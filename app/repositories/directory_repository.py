"""Reads for /people — SQL only, no business rules, no HTTP errors."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class DirectoryRepository:
    """One read: the recognition-eligible directory, actor and guests excluded."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_people(self, actor_id: Any, limit: int, search: str | None) -> list[dict[str, Any]]:
        """Eligible people for the recognition picker, full_name order.

        Exclusion semantics (spec B1): the acting user is excluded; guests
        (source = 'guest') are excluded; recognition_eligible IS FALSE is
        excluded, NULL is included — guarded additionally by
        employment_status = 'active' so an inactive person whose flag is
        still NULL cannot leak through (active is the default in practice;
        being explicit here costs nothing and keeps non-active NULL rows out).

        `search`, when present, matches full_name / title / email via a bound
        ILIKE parameter — never interpolated into the SQL text.
        """
        conditions = [
            "u.id <> :actor",
            "u.source <> 'guest'",
            "u.recognition_eligible IS NOT FALSE",
            "u.employment_status = 'active'",
        ]
        params: dict[str, Any] = {"actor": actor_id, "limit": limit}

        tidy_search = search.strip() if search else None
        if tidy_search:
            conditions.append("(u.full_name ILIKE :needle OR u.title ILIKE :needle OR u.email ILIKE :needle)")
            params["needle"] = f"%{tidy_search}%"

        result = await self._session.execute(
            text(
                "SELECT u.id, u.employee_code, u.full_name, u.email, "
                "u.title, u.department, "
                "m.id AS manager_id, m.employee_code AS manager_code, "
                "m.full_name AS manager_name "
                "FROM users u LEFT JOIN users m ON m.id = u.manager_id "
                "WHERE " + " AND ".join(conditions) + " "
                "ORDER BY u.full_name, u.employee_code LIMIT :limit"
            ),
            params,
        )
        return [dict(row) for row in result.mappings().all()]
