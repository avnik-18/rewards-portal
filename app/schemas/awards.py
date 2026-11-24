"""DTOs for the /awards catalog — the leader/admin screen behind the tab."""

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

Cadence = Literal["monthly", "quarterly", "annual"]


class AwardGuideline(BaseModel):
    title: str
    lines: list[str]


class AwardItem(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    cadence: Cadence
    period_name: str
    period_start: date
    period_end: date
    nominations_end: date | None = None
    prize_points: int
    nomination_quota: int
    requires_jury: bool
    guidelines: list[AwardGuideline] = []


class AwardsListResponse(BaseModel):
    awards: list[AwardItem]
