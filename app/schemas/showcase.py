"""Showcase DTOs — dashboard "Team highlights" carousel numbers (deliverable #5)."""

from pydantic import BaseModel


class JuryStatus(BaseModel):
    """Whether this caller is on a jury for the live cycle and already voted."""

    cast: bool
    assigned: bool


class ShowcaseResponse(BaseModel):
    """What the awards carousel needs: clock, categories, prize pot, caller's jury state."""

    days_to_nominations_close: int | None
    open_categories: int
    cycle_prize_total: int
    my_jury: JuryStatus
