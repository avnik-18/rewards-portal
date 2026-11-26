"""Leader-facing award-cycles reads + nomination submission (Work Item #3)
+ the DH approval lane (0031).

GET /awards/cycles serves the teammate's portal "Award cycles" section:
what admin set up (cadence, timeline, categories) plus the caller's
 NOMINATION-allowance per category. Persona-AGNOSTIC (like GET /awards/tile):
the browser-side display gate is the teammate UI's concern, never ours.

POST /awards/nominations submits a nomination — nominator is ALWAYS the
caller. The per-category limit/window/duplicate enforcement is in
fn_submit_nomination (0029) — the UI gate on the read payload is the same
predicate, never a substitute. Errors: the AwardsCycleDomainError → codes
('nomination_limit_reached'/'nomination_window_closed'/'item_already_nominated'/
'person_inactive' → 409, 'item_not_found'/'person_not_found' → 404).

The DH lane (Work Item #4) rides HERE too:
GET /awards/approvals/pending — the review queue the /approvals pages read
(stage='dh' nominations grouped per award). PATCH
/awards/nominations/{id}/decision — the DH verdict: approved routes the row
onward (status='endorsed', review_stage='admin'), declined returns it (with
the required note) to the nominator. Both are get_leader-gated: fn_persona
'leader' or 'admin' — plain employees get 403 BEFORE any data leaves.

The ADMIN final lane (0034) closes the pipeline here as well —
GET /awards/approvals/admin/pending lists the DH-endorsed rows (stage
'admin') with the DM + DH resolved inline; PATCH
/awards/nominations/{id}/admin-decision is the final call: approved credits
the award prize to the nominee's wallet (fn_nomination_admin_decide →
journal/ledger; trg_ledger_delta moves the balance) and closes the row
(status='result'); declined closes it as 'not_selected'. get_admin-gated —
admin persona only, 403 otherwise."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id, get_admin_id, get_leader_id
from app.db.session import get_session
from app.repositories.admin_awards_repository import AdminAwardsRepository
from app.schemas.admin_awards import (
    AdminApprovalsQueueResponse,
    ApprovalsQueueResponse,
    AwardsCycleResponse,
    NominationCreateRequest,
    NominationDecisionRequest,
    NominationResponse,
)
from app.services.admin_awards_service import AdminAwardsService

router = APIRouter(tags=["awards"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> AdminAwardsService:
    return AdminAwardsService(AdminAwardsRepository(session))


@router.get("/awards/cycles", response_model=list[AwardsCycleResponse])
async def awards_cycles(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
) -> list[AwardsCycleResponse]:
    """Every cycle (cadence + timeline) with its categories and the caller's
    remaining nomination allowance per category — the teammate portal UI's
    data source. Allowance = max_nominations_per_nominator − used-by-me."""
    return await service.cycles_for_user(actor_id)


@router.post("/awards/nominations", response_model=NominationResponse, status_code=status.HTTP_201_CREATED)
async def submit_nomination(
    body: NominationCreateRequest,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> NominationResponse:
    """Nominate a teammate for one award — nominator = the caller."""
    request.state.actor_id = actor_id
    return await service.submit_nomination(actor_id, body)


@router.get("/awards/approvals/pending", response_model=ApprovalsQueueResponse)
async def approvals_pending(
    actor_id: Annotated[UUID, Depends(get_leader_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
) -> ApprovalsQueueResponse:
    """The DH review lane — award categories carrying stage='dh'
    nominations plus those nominations (who nominated, the why-story,
    achievements, supporting docs), scoped to the caller's teams' lanes:
    a leader sees their own teams' queue, an admin sees everything."""
    return await service.approvals_pending(actor_id)


@router.patch("/awards/nominations/{nomination_id}/decision", status_code=status.HTTP_204_NO_CONTENT)
async def decide_nomination(
    nomination_id: UUID,
    body: NominationDecisionRequest,
    actor_id: Annotated[UUID, Depends(get_leader_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> None:
    """Record the DH verdict on one nomination: approved → the admin lane
    (staged), declined → returned to the nominator with the reason."""
    request.state.actor_id = actor_id
    await service.decide_nomination(actor_id, nomination_id, body)


@router.get("/awards/approvals/admin/pending", response_model=AdminApprovalsQueueResponse)
async def approvals_admin_pending(
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
) -> AdminApprovalsQueueResponse:
    """The admin final lane — every award category carrying DH-endorsed
    (review_stage='admin') nominations, plus those nominations with the DM
    (who nominated) and the DH (who endorsed) resolved inline."""
    return await service.approvals_admin_pending()


@router.patch("/awards/nominations/{nomination_id}/admin-decision", status_code=status.HTTP_204_NO_CONTENT)
async def decide_admin_nomination(
    nomination_id: UUID,
    body: NominationDecisionRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> None:
    """The admin's FINAL verdict: approved credits the award prize to the
    nominee's wallet and closes the row ('result'); declined closes it
    ('not_selected', optional reason)."""
    request.state.actor_id = actor_id
    await service.decide_admin_nomination(actor_id, nomination_id, body)
