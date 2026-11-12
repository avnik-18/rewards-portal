"""Leaderboard DTOs — dashboard deliverable #4 (top peer-point receivers).

The frontend façade adapts fields (points→pts, is_me→id); components never see
backend shapes directly.
"""

from pydantic import BaseModel, Field


class LeaderboardEntryResponse(BaseModel):
    """One ranked row of peer points RECEIVED this quarter."""

    rank: int
    name: str
    points: int
    is_me: bool


class LeaderboardResponse(BaseModel):
    """Top-N entries, best first."""

    entries: list[LeaderboardEntryResponse] = Field(default_factory=list)
