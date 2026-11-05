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
translated ONCE by the app-level handler (recognition_domain_handler +
main.py). Logging discipline (reviewer security note): only the RESOLVED
actor (stashed on request.state in get_actor_id) is logged — the raw
X-Demo-User header is attacker-controlled and never logged; the business
code goes to WARNING, raw DB detail stays at DEBUG."""

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Header, Request, status
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
                 "guest_cannot_receive", "no_allowance_for_period", "allocation_below_spent",
                 "points_out_of_range"}
NOT_FOUND = {"recipient_not_found", "item_not_found", "person_not_found", "prize_pool_empty",
             "account_not_found"}
FORBIDDEN = {"not_pending_for_decider", "self_admin_blocked", "insufficient_privilege"}
# coded for log detail, but these are DB integrity/config faults — always 500
INTEGRITY_FAULTS = frozenset({"hold_journal_missing", "hold_lines_missing", "no_budget_policy"})


def _code_status(code: str) -> int:
    if code in FORBIDDEN:
        return status.HTTP_403_FORBIDDEN
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
    # INTEGRITY_FAULTS and anything unmapped land here — 500 with an ERROR log
    return status.HTTP_500_INTERNAL_SERVER_ERROR


def recognition_domain_handler(request: Request, exc: Exception) -> JSONResponse:
    """App-level mapping: fn_* business codes → HTTP semantics, in one place."""
    if not isinstance(exc, RecognitionDomainError):
        raise exc
    actor_id = getattr(request.state, "actor_id", None)  # resolved, never the raw header
    status_code = _code_status(exc.code)
    if status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        log.error("recognition.unmapped_domain_code", code=exc.code,
                  path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    else:
        log.warning("recognition.domain_error", code=exc.code,
                    path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    return JSONResponse(status_code=status_code, content={"detail": exc.code})


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> RecognitionService:
    return RecognitionService(ApplauseRepository(session))


@router.post("/recognitions", response_model=RecognizeResponse)
async def recognize(
    body: RecognizeRequest,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
    request: Request,
    idempotency_key: Annotated[UUID | None, Header(alias="Idempotency-Key")] = None,
) -> RecognizeResponse:
    request.state.actor_id = actor_id
    rid, status_text, routed, item = await service.recognize(
        actor_id=actor_id,
        to_user_ids=body.to_user_ids,
        cc_user_ids=body.cc_user_ids,
        value_id=body.value_id,
        points=body.points,
        message=body.message,
        idempotency_key=idempotency_key,
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
    request: Request,
) -> DecisionResponse:
    request.state.actor_id = actor_id
    result = await service.decide(item_id, actor_id, body.approve, body.note)
    return DecisionResponse(approval_item_id=item_id, status=result)


@router.get("/recognitions/approvals", response_model=list[PendingApprovalRow])
async def pending_approvals(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
) -> list[PendingApprovalRow]:
    rows = await service.pending_for(actor_id)
    return [PendingApprovalRow.model_validate(r) for r in rows]
