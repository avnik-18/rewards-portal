"""Repository pattern reference — the data-access layer every real repository copies.

Conventions for the first real repository (after the DB team's Schema lands):
- constructed with the request-scoped AsyncSession (from db.session.get_session)
- one single-purpose async method per concrete query
- returns ORM models or narrow projections; never raises HTTP errors
- services own business rules; repositories own SQL only

Blocked on: first Alembic migration (recog-db team's schema).
"""

from sqlalchemy.ext.asyncio import AsyncSession


class DemoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_greeting(self, key: str) -> str | None:
        raise NotImplementedError(
            "DemoRepository.find_greeting requires real models/select "
            "(blocked on the DB team's schema)"
        )
