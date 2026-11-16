"""Reads for the demo-identity dropdown — SQL only, no business rules."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class DemoUsersRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[dict[str, Any]]:
        """The seeded directory: code, name, title (designation), department.

        Readable WITHOUT any identity header — the login screen has no actor
        yet; it is where one gets picked. Name-ordered so the dropdown is
        stable regardless of seed insertion order.
        """
        result = await self._session.execute(text(
            "SELECT employee_code, full_name, title, department "
            "FROM users ORDER BY full_name"))
        return [dict(row) for row in result.mappings().all()]
