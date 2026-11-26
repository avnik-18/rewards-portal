"""Leaderboard DTOs — dashboard deliverable #4 (top award-point winners).

The frontend façade adapts fields (points→pts, is_me→You chip); components
never see backend shapes directly.
"""

from uuid import UUID

from pydantic import BaseModel, Field


class LeaderboardEntryResponse(BaseModel):
    """One ranked row of award points WON — board is the caller's teams."""

    user_id: UUID
    rank: int
    name: str
    points: int
    is_me: bool


class LeaderboardResponse(BaseModel):
    """Top-N entries, best first."""

    entries: list[LeaderboardEntryResponse] = Field(default_factory=list)
