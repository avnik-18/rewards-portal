"""Thin service assembling /me and /me/stats — the Home screen's greeting
and "My activity" tiles. No business rules beyond shape assembly."""

from typing import Any

from app.repositories.me_repository import MeRepository


class MeRepositoryMissing(Exception):
    """The actor does not resolve to a users row."""


class MeService:
    def __init__(self, repo: MeRepository) -> None:
        self._repo = repo

    async def profile(self, actor_id: Any) -> dict[str, Any]:
        profile = await self._repo.profile(actor_id)
        if profile is None:
            raise MeRepositoryMissing("actor does not resolve to a users row")
        return profile

    async def stats(self, actor_id: Any) -> dict[str, Any]:
        balance = await self._repo.points_balance(actor_id)
        allowance = await self._repo.allowance(actor_id)
        allowance_left = allowance[0] if allowance is not None else None
        allowance_allocated = allowance[1] if allowance is not None else None
        return {
            "points_balance": balance,
            "allowance_left": allowance_left,
            "allowance_allocated": allowance_allocated,
            "recognitions_given": await self._repo.recognitions_given(actor_id),
            "recognitions_received": await self._repo.recognitions_received(actor_id),
        }
