"""Pydantic DTOs for the Excellence nomination + approval workflow."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AwardQuotaStatus(BaseModel):
    scope: str
    scope_value: str
    max_count: int
    used: int


class NominatedAward(BaseModel):
    """One award open for nomination, as the compose flow needs it."""

    award_id: UUID
    name: str
    description: str | None = None
    prize_points: int
    max_nominations_per_nominator: int
    used_by_nominator: int
    allow_self: bool = False
    allow_team: bool = False
    min_team_size: int = 1
    member_level_max: str | None = None
    grades: list[str] = Field(default_factory=list)
    departments: list[str] = Field(default_factory=list)
    min_tenure_months: int | None = None
    quotas: list[AwardQuotaStatus] = Field(default_factory=list)
    nominations_end: datetime | None = None


class OpenAwardsResponse(BaseModel):
    awards: list[NominatedAward]


class NominationDraftBody(BaseModel):
    award_id: UUID
    nominee_id: UUID | None = None
    team_id: UUID | None = None
    story: str = Field(min_length=30, max_length=4000)
    core_values: list[str] = Field(default_factory=list, max_length=5)
    achievements: str | None = Field(default=None, max_length=4000)
    support_doc_url: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _exactly_one_target(self) -> "NominationDraftBody":
        if (self.nominee_id is None) == (self.team_id is None):
            raise ValueError("provide nominee_id for an individual nomination OR team_id for a team award")
        return self


class NominationDraftCreate(NominationDraftBody):
    pass


class NominationDraftUpdate(NominationDraftBody):
    pass


class NominationSubmitResponse(BaseModel):
    nomination_id: UUID
    nomination_ref: str
    status: str
    routed_to: int


class ApprovalHistoryEntry(BaseModel):
    seq: int
    level: str
    owner_id: UUID
    owner_name: str
    status: str
    note: str | None = None
    decided_at: datetime | None = None


class NomineeRow(BaseModel):
    id: UUID
    full_name: str
    title: str | None = None
    department: str | None = None


class NominationRow(BaseModel):
    id: UUID
    nomination_ref: str | None = None
    award_id: UUID
    award_name: str
    prize_points: int
    status: str
    team_id: UUID | None = None
    team_name: str | None = None
    is_team_nomination: bool = False
    nominees: list[NomineeRow] = Field(default_factory=list)
    nominator_id: UUID
    nominator_name: str
    mine_to_manage: bool = False
    story: str
    core_values: list[str] = Field(default_factory=list)
    achievements: str | None = None
    support_doc_url: str | None = None
    is_self_nomination: bool = False
    returned_notes: str | None = None
    created_at: datetime


class NominationDetail(NominationRow):
    approval_history: list[ApprovalHistoryEntry] = Field(default_factory=list)
    can_edit: bool = False


class MyNominationsResponse(BaseModel):
    items: list[NominationRow]


class PendingDictDetail(BaseModel):
    detail: dict[str, Any]


class PendingApprovalRow(BaseModel):
    """One endorsement waiting on the viewer (the approvals board lane)."""

    item_id: UUID
    nomination_id: UUID
    nomination_ref: str | None = None
    award_name: str
    nominator_id: UUID
    nominator_name: str
    nominees: list[NomineeRow] = Field(default_factory=list)
    team_name: str | None = None
    story: str
    core_values: list[str] = Field(default_factory=list)
    achievements: str | None = None
    support_doc_url: str | None = None
    arrived_at: datetime


class PendingApprovalsResponse(BaseModel):
    items: list[PendingApprovalRow]


class NominationDecisionBody(BaseModel):
    verdict: str = Field(pattern="^(approve|reject|return)$")
    note: str | None = Field(default=None, max_length=2000)


class NominationDecisionResponse(BaseModel):
    item_id: UUID
    nomination_id: UUID
    nomination_ref: str | None = None
    status: str
    verdict: str


class DeletedNominationResponse(BaseModel):
    deleted: bool
