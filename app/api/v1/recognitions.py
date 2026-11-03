"""Recognition + approval endpoints — DTOs only, logic in the service layer.

The DB holds every business rule (routing, chain, money math) inside
fn_submit_recognition / fn_item_decide — see docs/db/design-source/README.md.

Identity: the actor is NEVER taken from the request body.
- Production (Entra configured): the actor is the JWT subject; the auth
  dependency refuses unvalidated tokens, so a production caller can never
  impersonate anyone.
- Dev fallback (no Entra): an explicit X-Demo-User: <employee_code> header
  resolves the actor; this header is the ONLY dev affordance and becomes
  inert the moment Entra is configured.

Domain errors: fn_* failures surface as RecognitionDomainError and are
translated ONCE by the app-level handler (see recognition_domain_handler +
main.py). Mapping order lives in ONE table of prefix sets per status class:
- CONFLICT set                → 409
- UNPROCESSABLE set           → 422
- NOT_FOUND set               → 404 (includes the approver_unresolvable_at_step_N
                                 family)
- not_pending_for_decider     → **403** (the caller is authenticated but is
                                 not an approver on this item)
- everything else             → 500 (see `any_other_domain_code`) — no
                                 unmapped code, connection issue or check
                                 violation can degrade into a 404
"""

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.applause_repository import ApplauseRepository
from app.schemas.recognition import (
    DecideRequest,
    DecisionResponse,
    PendingApprovalRow,
    RecognizeRequest,
    RecognizeResponse,
)
from app.services.recognition_service import RecognitionDomainError, RecognitionService

router = APIRouter(tags=["recognitions"])

log = structlog.get_logger(__name__)

CONFLICT = {"insufficient_points", "person_inactive", "double_refund_blocked",
            "self_recognition_blocked"}
UNPROCESSABLE = {"no_approval_route", "decline_note_required", "recipient_total_mismatch",
                 "guest_cannot_receive", "no_allowance_for_period", "allocation_below_spent"}
NOT_FOUND = {"approver_unresolvable", "prize_pool_empty"}
UNAUTHORIZED = {"item_state_mismatch", "invalid_state"}


def _code_status(code: str) -> int:
    if code == "not_pending_for_decider":
        return status.HTTP_403_FORBIDDEN
    if code == "item_state_mismatch":
        return status.HTTP_409_CONFLICT
    if any(code.startswith(prefix) for prefix in ("approver_unresolvable",)):
        return status.HTTP_404_NOT_FOUND
    if any(code.startswith(prefix) for prefix in ("item_already_",)):
        return status.HTTP_409_CONFLICT
    if code in CONFLICT:
        return status.HTTP_409_CONFLICT
    if code in UNPROCESSABLE:
        return status.HTTP_422_UNPROCESSABLE_ENTITY
    if code in NOT_FOUND:
        return status.HTTP_404_NOT_FOUND
    return status.HTTP_500_INTERNAL_SERVER_ERROR


def recognition_domain_handler(request: Request, exc: Exception) -> JSONResponse:
    """App-level mapping: fn_* business codes → HTTP semantics, in one place."""
    if not isinstance(exc, RecognitionDomainError):  # never reached; satisfies the handler protocol
        raise exc
    log.warning("recognition.domain_error", code=exc.code, detail=exc.detail,
                path=request.url.path,
                actor=str(request.headers.get("x-demo-user", "")))
    status_code = _code_status(exc.code)
    if status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        log.error("recognition.unmapped_domain_code", code=exc.code)
    return JSONResponse(status_code=status_code, content={"detail": exc.code})


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> RecognitionService:
    return RecognitionService(ApplauseRepository(session))


@router.post("/recognitions", response_model=RecognizeResponse)
async def recognize(
    body: RecognizeRequest,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
) -> RecognizeResponse:
    rid, status_text, routed, item = await service.recognize(
        actor_id=actor_id,
        to_user_ids=body.to_user_ids,
        cc_user_ids=body.cc_user_ids,
        value_id=body.value_id,
        points=body.points,
        message=body.message,
    )
    return RecognizeResponse(
        recognition_id=rid,
        status=status_text,
        routed_to=routed,
        approval_item_id=item,
    )


@router.post("/recognitions/approval/{item_id}/decide", response_model=DecisionResponse)
async def decide(
    item_id: UUID,
    body: DecideRequest,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
) -> DecisionResponse:
    result = await service.decide(item_id, actor_id, body.approve, body.note)
    return DecisionResponse(approval_item_id=item_id, status=result)


@router.get("/recognitions/approvals", response_model=list[PendingApprovalRow])
async def pending_approvals(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
) -> list[PendingApprovalRow]:
    rows = await service.pending_for(actor_id)
    return [PendingApprovalRow.model_validate(r) for r in rows]
