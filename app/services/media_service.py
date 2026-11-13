"""Thin service over the media registry — shape assembly only (no rules;
publishment lives in the DB rows admins edit)."""

from typing import Any

from app.repositories.media_repository import MediaRepository


class MediaService:
    def __init__(self, repo: MediaRepository) -> None:
        self._repo = repo

    async def hero(self) -> dict[str, Any] | None:
        """None means no hero is published right now (the router turns that
        into the 404 hero_not_published contract)."""
        return await self._repo.live_hero()
