"""DTOs for /media — the Home screen's hero section."""

from uuid import UUID

from pydantic import BaseModel


class MediaHeroResponse(BaseModel):
    id: UUID
    title: str
    url: str
    poster_url: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None
