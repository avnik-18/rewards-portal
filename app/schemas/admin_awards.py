"""Admin awards DTOs — cycles & categories tab (Work Item #1) + Work Item #3
(cycle creation/timeline, nomination limit, leader-facing read, nomination
submission) + the portal's GET /awards/tile read (AwardsTileResponse)."""

from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

CadenceLiteral = Literal["monthly", "quarterly", "annual"]


class AwardGuidelineSection(BaseModel):
    """One rendered section of the portal's Guidelines modal — the admin
    authors at least Eligibility (our sections: Eligibility, Applicability)."""

    title: str
    lines: list[str] = []


class GuidelineSectionsMixin(BaseModel):
    """Legacy-award tolerance: awards predating guideline authoring carry a
    NULL jsonb, and the fn payload passes booleans through as list fields —
    both degrade to the empty list the portal modal renders."""

    guidelines: list[AwardGuidelineSection] = []

    @field_validator("guidelines", mode="before")
    @classmethod
    def _coerce_sections(cls, value: Any) -> Any:
        if value is None:
            return []
        if isinstance(value, list):
            return [dict(section, lines=section.get("lines") or [])
                    for section in value if isinstance(section, dict)]
        return value


class AdminCycleCreateRequest(BaseModel):
    """Create one award cycle: a fiscal period row + its timeline. Cadence is
    an award property — the cycle only carries the umbrella dates (0033: no
    voting — the timeline is nominations_close → results_on)."""

    name: str = Field(min_length=1, max_length=80)
    starts: date
    ends: date
    nominations_close: date | None = None
    results_on: date | None = None


class AdminCycleTimelineRequest(BaseModel):
    """PUT semantics — the full new timeline; a null clears the date."""

    nominations_close: date | None = None
    results_on: date | None = None


class AdminAwardUpsertRequest(GuidelineSectionsMixin):
    """Create (id=None) or edit (id set) one award category in a period. The
    portal-facing authoring fields ride along: the award's own cadence, the
    tile art link, the card description and the guideline sections. 0033: no
    voting — the category carries the NOMINATION WINDOW (open/close) plus the
    DH approval window."""

    period_id: UUID
    id: UUID | None = None
    name: str = Field(min_length=1)
    value_id: UUID | None = None
    prize_points: int = Field(gt=0)
    nominations_start: date | None = None
    nominations_end: date | None = None
    requires_jury: bool = True
    max_nominations_per_nominator: int = Field(default=1, ge=1)
    cadence: CadenceLiteral = "quarterly"
    description: str | None = None
    photo_url: str | None = None
    approval_start: date | None = None
    approval_end: date | None = None


class AdminAwardPhaseRequest(BaseModel):
    """Phase set request — the fn allows the immediate forward step (0033: no
    voting — draft→nominations→closed→result), plus the one sideways dissolve:
    'cancelled' from any pre-decision phase."""

    phase: Literal["draft", "nominations", "closed", "result", "cancelled"]


class AdminCycleContentRequest(BaseModel):
    """Tile copy for one period; headline may carry the {points} token."""

    headline: str = Field(min_length=1, max_length=200)
    tagline: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None


class AdminAwardItem(GuidelineSectionsMixin):
    id: UUID
    name: str
    description: str | None = None
    photo_url: str | None = None
    cadence: str = "quarterly"
    prize_points: int
    phase: str
    nominations_start: date | None = None
    nominations_end: date | None = None
    requires_jury: bool = True
    max_nominations_per_nominator: int | None = None
    approval_start: date | None = None
    approval_end: date | None = None


class AdminCycleContentResponse(BaseModel):
    headline: str
    tagline: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None


class AdminCycleResponse(BaseModel):
    id: UUID
    name: str
    starts: date
    ends: date
    is_current: bool
    nominations_close: date | None = None
    results_on: date | None = None
    content: AdminCycleContentResponse | None = None
    awards: list[AdminAwardItem]


class AdminAwardResponse(BaseModel):
    id: UUID


class AwardsCycleCategoryResponse(GuidelineSectionsMixin):
    """One award category as the leader-facing read serves it — the caller's
    nomination allowance included (remaining_allowance ≥ 0), plus the fields
    the portal card renders (description, art, cadence, guidelines). 0033: no
    voting — the category carries the nomination window's open/close."""

    id: UUID
    name: str
    description: str | None = None
    photo_url: str | None = None
    cadence: str = "quarterly"
    phase: str
    prize_points: int
    requires_jury: bool
    nominations_start: date | None = None
    nominations_end: date | None = None
    max_nominations_per_nominator: int = 1
    nominated_by_me: int = 0
    remaining_allowance: int = 0


class AwardsCycleResponse(BaseModel):
    """One award cycle for the portal's "Award cycles" section — the admin-set
    umbrella timeline plus the per-category rows."""

    id: UUID
    name: str
    starts: date
    ends: date
    is_current: bool
    nominations_close: date | None = None
    results_on: date | None = None
    categories: list[AwardsCycleCategoryResponse]


class NominationSupportingDoc(BaseModel):
    """One DM-attached supporting link in the nomination dossier."""

    label: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=1, max_length=400)


class NominationCreateRequest(BaseModel):
    """Nominate one teammate for one award — nominator is ALWAYS the caller
    (is_self_nomination is derived by the table CHECK, never body-supplied).
    The dossier extras (0031, DH approval lane) are optional: awards data
    without them submits identically."""

    award_id: UUID
    nominee_id: UUID
    story: str = ""
    achievements: list[str] = []
    supporting_docs: list[NominationSupportingDoc] = []


class NominationResponse(BaseModel):
    id: UUID
    status: str = "submitted"


# ===== the DH approval lane (0031) — GET /awards/approvals/pending + PATCH
# /awards/nominations/{id}/decision. Field names mirror the front-end
# approval contract 1:1 (awards: due_date off nominations_end; nominations:
# `why` = the story, docs = supporting_docs), so the wire shape IS the
# contract, not a translation the UI has to guess. =====


class ApprovalAwardRow(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    due_date: date | None = None
    cadence: str = "quarterly"
    approval_start: date | None = None
    approval_end: date | None = None


class NominationApprovalRow(BaseModel):
    id: UUID
    award_id: UUID
    nominee_code: str | None = None
    nominee_name: str
    nominee_title: str | None = None
    nominator_name: str
    nominator_title: str | None = None
    why: str
    achievements: list[str] = []
    docs: list[NominationSupportingDoc] = []
    submitted_at: datetime


class ApprovalsQueueResponse(BaseModel):
    awards: list[ApprovalAwardRow] = []
    nominations: list[NominationApprovalRow] = []


class AdminApprovalAwardRow(ApprovalAwardRow):
    """The admin lane's award row — carries the prize that the final
    approval credits to the winner's wallet."""

    prize_points: int


class AdminApprovalNominationRow(BaseModel):
    """One DH-endorsed nomination waiting for the admin's final call — the
    DM (who nominated) and the DH (who endorsed it) resolved inline."""

    id: UUID
    award_id: UUID
    nominee_code: str | None = None
    nominee_name: str
    nominee_title: str | None = None
    nominator_name: str
    nominator_title: str | None = None
    dh_decided_by: str
    dh_decided_title: str | None = None
    dh_decided_at: datetime
    why: str
    achievements: list[str] = []
    docs: list[NominationSupportingDoc] = []
    submitted_at: datetime


class AdminApprovalsQueueResponse(BaseModel):
    awards: list[AdminApprovalAwardRow] = []
    nominations: list[AdminApprovalNominationRow] = []


class NominationDecisionRequest(BaseModel):
    """The DH verdict — approve (routes onward to the admin lane), or decline
    WITH the required reason; the UI enforces the note transport-side too."""

    decision: Literal["approved", "declined"]
    note: str | None = None


class AwardsTileResponse(BaseModel):
    """All fields None ⇔ no live cycle — the frontend then renders its
    built-in fallback copy instead of ever blanking the tile."""

    period_label: str | None = None
    prize_total: int | None = None
    days_to_nominations_close: int | None = None
    headline: str | None = None
    tagline: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None
