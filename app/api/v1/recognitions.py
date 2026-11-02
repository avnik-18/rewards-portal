"""Recognition + approval endpoints — DTOs only, logic in the service layer.

The DB holds every business rule (routing, chain, money math) inside
fn_submit_recognition / fn_item_decide — see db/README.md.

Identity: the actor is NEVER taken from the request body.
- Production (Entra configured): the actor is the JWT subject; the auth
  dependency refuses unvalidated tokens, so a production caller can never
  impersonate anyone.
- Dev fallback (no Entra): an explicit X-Demo-User: <employee_code> header
  resolves the actor; this header is the ONLY dev affordance and becomes
  inert the moment Entra is configured.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.session import get_session
from app.repositories.applause_repository import ApplauseRepository
from app.schemas.auth import CurrentUser
from app.schemas.recognition import (
    DecideRequest,
    DecisionResponse,
    PendingApprovalRow,
    RecognizeRequest,
    RecognizeResponse,
)
from app.services.recognition_service import RecognitionDomainError, RecognitionService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["recognitions"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> RecognitionService:
    return RecognitionService(ApplauseRepository(session))


async def _actor_id(
    x_demo_user: Annotated[str | None, Header()] = None,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
) -> UUID:
    """Resolve the acting user's DB id from the authentication dependency.

    Production: the JWT subject must map to users.external_id — blocked until
    the Entra JWT wiring lands (app/core/security.py). Dev: X-Demo-User header.
    """
    settings = get_settings()
    if settings.entra_authority:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "recognitions require the Entra JWT subject mapping "
            "(users.external_id) — blocked on the App registration",
        )
    if not x_demo_user:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "dev mode requires the X-Demo-User: <employee_code> header",
        )
    actor = await ApplauseRepository(session).user_id_by_code(x_demo_user)
    if actor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"unknown demo user: {x_demo_user}")
    return actor


@router.post("/recognitions", response_model=RecognizeResponse)
async def recognize(
    body: RecognizeRequest,
    actor_id: Annotated[UUID, Depends(_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
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
    item_id: str,
    body: DecideRequest,
    actor_id: Annotated[UUID, Depends(_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> DecisionResponse:
    try:
        result = await service.decide(item_id, actor_id, body.approve, body.note)
    except RecognitionDomainError as e:
        code, detail = e.code, e.detail
        if code in {"insufficient_points", "person_inactive", "double_refund_blocked",
                    "self_recognition_blocked", "item_already_pending",
                    "item_already_approved", "item_already_declined",
                    "item_already_returned", "item_already_cancelled"}:
            raise HTTPException(status.HTTP_409_CONFLICT, code) from e
        if code in {"no_approval_route", "decline_note_required", "recipient_total_mismatch",
                    "guest_cannot_receive", "no_allowance_for_period",
                    "allocation_below_spent"}:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, code) from e
        raise HTTPException(status.HTTP_404_NOT_FOUND, code) from e
    return DecisionResponse(approval_item_id=item_id, status=result)


@router.get("/recognitions/approvals", response_model=list[PendingApprovalRow])
async def pending_approvals(
    actor_id: Annotated[UUID, Depends(_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> list[PendingApprovalRow]:
    rows = await service.pending_for(actor_id)
    return [PendingApprovalRow(**r) for r in rows]  # type: ignore[misc]
