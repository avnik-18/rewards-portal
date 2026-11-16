"""Thin service for the demo-identity dropdown — no business rules."""

from typing import Any

from app.repositories.demo_users_repository import DemoUsersRepository


class DemoUsersService:
    def __init__(self, repo: DemoUsersRepository) -> None:
        self._repo = repo

    async def list(self) -> list[dict[str, Any]]:
        return await self._repo.list()
