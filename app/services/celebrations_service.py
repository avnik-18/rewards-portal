"""Thin service assembling /celebrations — no business rules to apply; the
relevance filter lives in the read itself. The window stays caller-chosen
within sane bounds so the rail can ask a quarter or a month."""

from typing import Any

from app.repositories.celebrations_repository import CelebrationsRepository

MIN_WINDOW_DAYS = 1
MAX_WINDOW_DAYS = 120
DEFAULT_WINDOW_DAYS = 30


def clamp_window_days(days: int) -> int:
    return max(MIN_WINDOW_DAYS, min(MAX_WINDOW_DAYS, days))


class CelebrationsService:
    def __init__(self, repo: CelebrationsRepository) -> None:
        self._repo = repo

    async def upcoming(self, actor_id: Any, window_days: int) -> list[dict[str, Any]]:
        return await self._repo.upcoming(actor_id, clamp_window_days(window_days))
