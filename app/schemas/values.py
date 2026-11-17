"""Values catalog DTOs — GET /values (recognition template picker payload).

Nested shape: each active value carries its active recognition templates;
when a template's art_json has no usable urls array, art_urls is an empty
list (tolerant to a missing or non-array value).
"""

from uuid import UUID

from pydantic import BaseModel, Field


class TemplateRowResponse(BaseModel):
    """One active recognition template under a value."""

    id: UUID
    name: str
    emoji: str | None = None
    art_urls: list[str] = Field(default_factory=list)
    prefill: str | None = None


class ValueRowResponse(BaseModel):
    """One active recognition value with its active templates."""

    id: UUID
    key: str
    label: str
    templates: list[TemplateRowResponse] = Field(default_factory=list)
