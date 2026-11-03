"""Recognition + approval DTOs — XxxRequest / XxxResponse convention.

The actor identity is NEVER part of these DTOs — it comes from the auth
dependency (app.core.actor.get_actor_id), never from the body.
"""

from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class RecognizeRequest(BaseModel):
    """POST /recognitions — send a praise (value/template optional, message ≤ chars 2000)."""

    to_user_ids: list[UUID] = Field(min_length=1)
    cc_user_ids: list[UUID] = Field(default_factory=list)
    value_id: UUID | None = None
    points: int = Field(ge=0, le=9999)
    message: str = Field(default="", max_length=2000)

    @field_validator("message", mode="before")
    @classmethod
    def blank_ok(cls, v: object) -> str:
        return str(v)


class RecognizeResponse(BaseModel):
    """What fn_submit_recognition reports back to the caller."""

    recognition_id: UUID
    status: str
    routed_to: int  # 0 = auto-approved in-transaction, else number of pending steps
    approval_item_id: UUID | None = None


class DecideRequest(BaseModel):
    """POST /recognitions/approval/{item_id}/decide — approve|decline (+ mandatory note on decline)."""

    approve: bool
    note: str | None = Field(default=None, max_length=500)


class DecisionResponse(BaseModel):
    approval_item_id: UUID
    status: str


class PendingApprovalRow(BaseModel):
    approval_item_id: UUID
    kind: str
    seq: int
    level: str
    mode: str
    owner_id: UUID
    submitter_name: str
    points: int
    note: str | None = None
