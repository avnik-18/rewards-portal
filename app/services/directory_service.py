"""Directory adapter — thin above DirectoryRepository.

No rules beyond what the SQL already applies (actor/guest/eligibility
exclusions); the repo's row dicts pass through unchanged for the router to
shape into PersonRowResponse.
"""

from typing import Any
from uuid import UUID

from app.repositories.directory_repository import DirectoryRepository


class DirectoryService:
    def __init__(self, repo: DirectoryRepository) -> None:
        self._repo = repo

    async def list_people(self, actor_id: UUID, limit: int, search: str | None = None) -> list[dict[str, Any]]:
        return await self._repo.list_people(actor_id=actor_id, limit=limit, search=search)
