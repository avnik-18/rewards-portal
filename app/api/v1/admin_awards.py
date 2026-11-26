"""Admin awards endpoints — cycles & categories management (Work Item #1).

Persona gate: get_admin_id resolves the caller (shared identity rule) and
requires fn_persona='admin' — 403 for every non-admin BEFORE any service
call; the fn bodies keep their C549Q gate as defence-in-depth.

Domain errors: fn_* failures surface as AdminAwardsDomainError, translated
ONCE by the app-level handler registered in main.py — insufficient_privilege
→ 403, admin_validation / award_locked → 400, anything unmapped → 500.
All rules live IN the DB (ADR 0001); routes validate DTOs only."""

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_admin_id
from app.db.session import get_session
from app.repositories.admin_awards_repository import AdminAwardsRepository
from app.schemas.admin_awards import (
    AdminAwardPhaseRequest,
    AdminAwardResponse,
    AdminAwardUpsertRequest,
    AdminCycleContentRequest,
    AdminCycleCreateRequest,
    AdminCycleResponse,
    AdminCycleTimelineRequest,
)
from app.services.admin_awards_service import AdminAwardsDomainError, AdminAwardsService

router = APIRouter(tags=["admin-awards"])

log = structlog.get_logger(__name__)

FORBIDDEN = {"insufficient_privilege", "not_your_lane"}
REQUESTED = {"admin_validation", "award_locked", "decline_note_required"}
# nominations slice (0029): submission-window/cap rejections + the friendly
# duplicate raise (C5495 → 'item_already_nominated' completed from the message).
# DH lane (0031): a second verdict on an already-decided row lands here too
# (the C5495 dynamic raise completes 'item_already_decided').
CONFLICT = {"nomination_limit_reached", "nomination_window_closed",
            "item_already_nominated", "item_already_decided", "person_inactive"}
NOT_FOUND = {"item_not_found", "person_not_found"}
# coded for log detail: admin_validation/award_locked → 400, checks above →
# their families, anything unlisted lands on 500 with an ERROR log


def admin_awards_domain_handler(request: Request, exc: Exception) -> JSONResponse:
    """App-level mapping: admin fn_* codes → HTTP semantics, in one place."""
    if not isinstance(exc, AdminAwardsDomainError):
        raise exc
    actor_id = getattr(request.state, "actor_id", None)  # resolved, never the raw header
    if exc.code in FORBIDDEN:
        status_code = status.HTTP_403_FORBIDDEN
    elif exc.code in CONFLICT:
        status_code = status.HTTP_409_CONFLICT
    elif exc.code in NOT_FOUND:
        status_code = status.HTTP_404_NOT_FOUND
    elif exc.code in REQUESTED:
        status_code = status.HTTP_400_BAD_REQUEST
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        log.error("admin_awards.unmapped_domain_code", code=exc.code,
                  path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    else:
        log.warning("admin_awards.domain_error", code=exc.code,
                    path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    return JSONResponse(status_code=status_code, content={"detail": exc.code})


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> AdminAwardsService:
    return AdminAwardsService(AdminAwardsRepository(session))


@router.get("/admin/awards/cycles", response_model=list[AdminCycleResponse])
async def admin_list_cycles(
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
) -> list[AdminCycleResponse]:
    """Every fiscal period with its tile content row and its award categories."""
    return await service.list_cycles(actor_id)


@router.post("/admin/awards/cycles", response_model=AdminAwardResponse,
             status_code=status.HTTP_201_CREATED)
async def admin_create_cycle(
    body: AdminCycleCreateRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> AdminAwardResponse:
    """Create an award cycle: fiscal period row + umbrella timeline."""
    request.state.actor_id = actor_id
    cycle_id = await service.create_cycle(actor_id, body)
    return AdminAwardResponse(id=cycle_id)


@router.put("/admin/awards/cycles/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_set_cycle_timeline(
    period_id: UUID,
    body: AdminCycleTimelineRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> None:
    """Edit the cycle's timeline (PUT semantics — full replacement)."""
    request.state.actor_id = actor_id
    await service.set_cycle_timeline(actor_id, period_id, body)


@router.post("/admin/awards", response_model=AdminAwardResponse,
             status_code=status.HTTP_201_CREATED)
async def admin_create_award(
    body: AdminAwardUpsertRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> AdminAwardResponse:
    request.state.actor_id = actor_id
    award_id = await service.upsert_award(actor_id, body)
    return AdminAwardResponse(id=award_id)


@router.put("/admin/awards/{award_id}", response_model=AdminAwardResponse)
async def admin_update_award(
    award_id: UUID,
    body: AdminAwardUpsertRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> AdminAwardResponse:
    """Edit one category — the path id wins over any body id."""
    request.state.actor_id = actor_id
    body.id = award_id
    updated_id = await service.upsert_award(actor_id, body)
    return AdminAwardResponse(id=updated_id)


@router.patch("/admin/awards/{award_id}/phase", status_code=status.HTTP_204_NO_CONTENT)
async def admin_set_award_phase(
    award_id: UUID,
    body: AdminAwardPhaseRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> None:
    """Run one category's phase forward exactly one step (or dissolve to
    cancelled)."""
    request.state.actor_id = actor_id
    await service.set_award_phase(actor_id, award_id, body)


@router.delete("/admin/awards/{award_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_award(
    award_id: UUID,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> None:
    """Permanent cleanup for dissolved (cancelled) categories — allowed once
    the 2-day cool-off has passed, or immediately with zero nominations."""
    request.state.actor_id = actor_id
    await service.delete_award(actor_id, award_id)


@router.put("/admin/awards/content/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_put_cycle_content(
    period_id: UUID,
    body: AdminCycleContentRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[AdminAwardsService, Depends(_service)],
    request: Request,
) -> None:
    """Author the portal tile copy for one period (upsert by period)."""
    request.state.actor_id = actor_id
    await service.upsert_cycle_content(actor_id, period_id, body)
