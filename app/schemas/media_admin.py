"""DTOs for the admin's media registry + feed-post ops (hero banners WIP)."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

MediaKind = Literal["hero_carousel_video", "news_banner"]


class AdminMediaAssetResponse(BaseModel):
    id: UUID
    kind: str
    title: str
    url: str
    poster_url: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None
    sort_order: int
    is_active: bool
    effective_from: datetime
    effective_to: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AdminMediaAssetCreateRequest(BaseModel):
    kind: MediaKind
    title: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=8, max_length=1000)
    poster_url: str | None = Field(default=None, max_length=1000)
    cta_label: str | None = Field(default=None, max_length=100)
    cta_url: str | None = Field(default=None, max_length=1000)
    sort_order: int = 0
    is_active: bool = True


class AdminMediaAssetPatchRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    url: str | None = Field(default=None, max_length=1000)
    poster_url: str | None = Field(default=None, max_length=1000)
    cta_label: str | None = Field(default=None, max_length=100)
    cta_url: str | None = Field(default=None, max_length=1000)
    sort_order: int | None = None


class AdminPostRow(BaseModel):
    """One feed post for the moderation table."""

    id: UUID
    kind: str
    entity_type: str
    is_public: bool
    actor_name: str | None = None
    actor_code: str | None = None
    message: str | None = None
    post_points: int = 0
    recipient_count: int = 0
    occurred_at: datetime


class AdminPostPatchRequest(BaseModel):
    """Edit the text a feed post shows — the story/message behind the row."""

    message: str = Field(min_length=1, max_length=4000)


class AdminPostsResponse(BaseModel):
    posts: list[AdminPostRow]
