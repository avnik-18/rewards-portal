"""Feed DTOs — the post-login recognition feed (dashboard deliverable).

Score-ordered feed (admin/leader/employee) over fn_feed_posts: each row carries
the continuous ranking score, the legacy tier label (own/team/bu/related) for
badge semantics, and a (score, occurred_at, recognition_id) keyset cursor;
components never see backend shapes directly.
"""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

FeedTier = Literal["bu", "own", "team", "related"]


class FeedRecipientResponse(BaseModel):
    """One recipient of the recognised moment."""

    user_id: UUID
    name: str | None
    points: int
    kind: str


class FeedPostResponse(BaseModel):
    """One feed entry, scored and score-ordered by fn_feed_posts."""

    recognition_id: UUID
    tier: FeedTier
    score: float
    occurred_at: datetime
    giver_id: UUID | None
    giver_name: str | None
    giver_avatar: str | None
    kind: str
    message: str
    points: int
    value_label: str | None
    recipients: list[FeedRecipientResponse] = Field(default_factory=list)


class FeedCursor(BaseModel):
    """Keyset cursor: the last item's sort keys, passed back verbatim."""

    score: float
    occurred_at: datetime
    recognition_id: UUID


class FeedResponse(BaseModel):
    """One page plus the cursor for the next, and the viewer's persona."""

    persona: Literal["admin", "leader", "employee"]
    items: list[FeedPostResponse] = Field(default_factory=list)
    next_cursor: FeedCursor | None = None
