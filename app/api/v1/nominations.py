"""Excellence award nomination endpoints — the team's compose contract.

Adapted to run on OUR approval engine: the draft lifecycle, open awards,
teams, mine/manage and the detail read live here; the DECISION endpoints
are NOT exposed here — our awards lane
(GET /awards/approvals/dh/pending + PATCH /awards/nominations/{id}/decision,
the admin lane pair) owns decisions, and the detail trail is synthesized
from the row state so the frontend's history section renders.
Only endpoints the merged frontend actually calls are registered.
"""

from typing import Annotated, Any
from uuid import UUID

import structlog
from fastapi import (
    APIRouter,
    Depends,
    Request,
    status,
)
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.nominations_repository import NominationsRepository
from app.schemas.nominations import (
    DeletedNominationResponse,
    MyNominationsResponse,
    NominationDetail,
    NominationDraftCreate,
    NominationDraftUpdate,
    NominationRow,
    NominationSubmitResponse,
    NomineeRow,
    OpenAwardsResponse,
)
from app.services.nominations_service import (
    NominationDomainError,
    NominationsService,
    _code_status,
)

router = APIRouter(tags=["nominations"])

log = structlog.get_logger(__name__)


def nomination_domain_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, NominationDomainError):
        raise exc
    actor_id = getattr(request.state, "actor_id", None)
    status_code = _code_status(exc.code)
    if status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        log.error("nominations.unmapped_domain_code", code=exc.code,
                  path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    else:
        log.warning("nominations.domain_error", code=exc.code,
                    path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    return JSONResponse(status_code=status_code, content={"detail": exc.code})


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> NominationsService:
    return NominationsService(NominationsRepository(session))


@router.get("/nominations/awards", response_model=OpenAwardsResponse)
async def open_awards(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> OpenAwardsResponse:
    request.state.actor_id = actor_id
    return OpenAwardsResponse(awards=await service.open_awards(actor_id))


@router.get("/nominations/teams")
async def team_choices(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> list[dict[str, Any]]:
    """Team picker rows for team awards — scoped to the caller: an admin
    sees every team, a leader sees only the teams they own as DM (0036),
    and lead_id carries the team's DM (the record-level nominee role)."""
    request.state.actor_id = actor_id
    teams = await service.teams(actor_id)
    return [
        {
            "team_id": str(t["id"]),
            "name": t["name"],
            "member_count": int(t["member_count"] or 0),
            "lead_id": str(t["lead_id"]) if t.get("lead_id") else None,
        }
        for t in teams
    ]


@router.get("/nominations/people")
async def nominee_choices(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> list[dict[str, Any]]:
    """Nominee picker rows — scoped to the caller: an admin sees the whole
    active directory, a leader sees the members of their DM teams (plus
    themself, so allow-self awards keep working) (0036)."""
    request.state.actor_id = actor_id
    return [
        {
            "id": str(p["id"]),
            "full_name": p["full_name"],
            "title": p["title"],
            "department": p["department"],
        }
        for p in await service.nominee_choices(actor_id)
    ]


@router.post("/nominations/awards/{award_id}/release")
async def release_award(
    award_id: UUID,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> dict[str, Any]:
    request.state.actor_id = actor_id
    return await service.release_award(actor_id, award_id)


@router.post("/nominations/draft", status_code=status.HTTP_201_CREATED)
async def create_draft(
    body: NominationDraftCreate,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> dict[str, Any]:
    request.state.actor_id = actor_id
    return await service.draft(
        actor_id, body.award_id, body.nominee_id, body.team_id,
        body.story, body.core_values, body.achievements, body.support_doc_url)


@router.put("/nominations/{nomination_id}")
async def update_nomination(
    nomination_id: UUID,
    body: NominationDraftUpdate,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> dict[str, Any]:
    request.state.actor_id = actor_id
    return await service.update(actor_id, nomination_id, body.model_dump())


@router.delete("/nominations/{nomination_id}", response_model=DeletedNominationResponse)
async def discard_nomination(
    nomination_id: UUID,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> DeletedNominationResponse:
    request.state.actor_id = actor_id
    deleted = await service.delete(actor_id, nomination_id)
    return DeletedNominationResponse(deleted=deleted)


@router.post("/nominations/{nomination_id}/submit", response_model=NominationSubmitResponse)
async def submit_nomination(
    nomination_id: UUID,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> NominationSubmitResponse:
    request.state.actor_id = actor_id
    outcome = await service.submit(actor_id, nomination_id)
    detail = await service.detail(actor_id, nomination_id)
    if detail is None:
        raise NominationDomainError("nomination_not_found", "nomination not found")
    return NominationSubmitResponse(
        nomination_id=nomination_id,
        nomination_ref=detail["nomination_ref"] or "",
        status=detail["status"],
        routed_to=outcome["routed_to"],
    )


@router.get("/nominations/mine", response_model=MyNominationsResponse)
async def my_nominations(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> MyNominationsResponse:
    request.state.actor_id = actor_id
    return MyNominationsResponse(items=[_row_dto(r) for r in await service.mine(actor_id)])


@router.get("/nominations/manage", response_model=MyNominationsResponse)
async def managed_nominations(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> MyNominationsResponse:
    request.state.actor_id = actor_id
    return MyNominationsResponse(items=[_row_dto(r) for r in await service.manage_list(actor_id)])


@router.get("/nominations/{nomination_id}", response_model=NominationDetail)
async def nomination_detail(
    nomination_id: UUID,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NominationsService, Depends(_service)],
    request: Request,
) -> NominationDetail:
    request.state.actor_id = actor_id
    detail = await service.detail(actor_id, nomination_id)
    if detail is None:
        raise NominationDomainError("nomination_not_found", "nomination not found")
    resp = NominationDetail(
        **_row_dto(detail).model_dump(),
        approval_history=[{
            "seq": h["seq"], "level": h["level"], "owner_id": h["owner_id"],
            "owner_name": h["owner_name"], "status": h["status"],
            "note": h.get("note"), "decided_at": h.get("decided_at"),
        } for h in detail.get("approval_history", [])],
        can_edit=bool(detail.get("can_edit")),
    )
    return resp


def _row_dto(r: dict[str, Any]) -> NominationRow:
    return NominationRow(
        id=r["id"],
        nomination_ref=r.get("nomination_ref"),
        award_id=r["award_id"],
        award_name=r["award_name"],
        prize_points=int(r["prize_points"]),
        status=r["status"],
        team_id=r.get("team_id"),
        team_name=r.get("team_name"),
        is_team_nomination=r.get("team_id") is not None,
        nominees=[NomineeRow(
            id=r["nominee_id"],
            full_name=r["nominee_name"],
            title=r.get("nominee_title"),
            department=r.get("nominee_department"),
        )] if r.get("nominee_id") else [],
        nominator_id=r["nominator_id"],
        nominator_name=r["nominator_name"],
        mine_to_manage=bool(r.get("is_nominator")),
        story=r["story"],
        core_values=list(r.get("core_values") or []),
        achievements=r.get("achievements"),
        support_doc_url=r.get("support_doc_url"),
        is_self_nomination=bool(r.get("is_self_nomination")),
        returned_notes=r.get("returned_notes"),
        created_at=r["created_at"],
    )
