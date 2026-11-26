"""Recognition DTOs — XxxRequest / XxxResponse convention.

The actor identity is NEVER part of these DTOs — it comes from the auth
dependency (app.core.actor.get_actor_id), never from the body.
"""

from typing import Self
from uuid import UUID

from pydantic import BaseModel, Field, ValidationInfo, field_validator, model_validator


class RecognizeRequest(BaseModel):
    """POST /recognitions — a cheers-for-peers send: zero points, published
    to the feed in the same transaction (points live only in the award lane)."""

    to_user_ids: list[UUID] = Field(min_length=1, max_length=25)
    cc_user_ids: list[UUID] = Field(default_factory=list, max_length=50)
    value_id: UUID | None = None
    template_id: UUID | None = None
    art_url: str | None = Field(default=None, max_length=2048)
    points: int = Field(default=0, ge=0, le=0)
    message: str = Field(default="", max_length=2000)

    @field_validator("to_user_ids", "cc_user_ids")
    @classmethod
    def no_hidden_duplicates(cls, v: list[UUID], info: ValidationInfo) -> list[UUID]:
        """Rejects same-person duplicates — the fn only catches self-recognition,
        leaving repeated recipients to stretch routing unnaturally (reviewer)."""
        seen = set(v)
        if len(seen) != len(v):
            raise ValueError(f"duplicate recipient in '{info.field_name}'")
        return v

    @model_validator(mode="after")
    def to_and_cc_disjoint(self) -> Self:
        # runs after ALL fields are set — a field_validator on to_user_ids
        # could not see cc_user_ids (Pydantic v2 runs validators in field
        # order), so the overlap check was dead code (reviewer)
        overlap = set(self.to_user_ids) & set(self.cc_user_ids)
        if overlap:
            raise ValueError("a recipient cannot also be in cc")
        return self

    @field_validator("message", mode="before")
    @classmethod
    def blank_ok(cls, v: object) -> object:
        """bug fix (reviewer): None must not become the string "None".
        Non-string non-None values still fail str validation (422)."""
        if v is None:
            return ""
        return v


class RecognizeResponse(BaseModel):
    """What fn_submit_recognition reports back to the caller — a direct
    publish: status is 'approved', routed_to 0, approval_item_id None."""

    recognition_id: UUID
    status: str
    routed_to: int
    approval_item_id: UUID | None = None


class RecognitionsCountResponse(BaseModel):
    """GET /recognitions/count — the org-wide total, any status.

    Every recognition_history row counts (a created recognition shows even
    while pending or declined). No period/user/status scoping — the total is
    the program-lifetime count the Home screen displays."""

    total: int = Field(ge=0)
