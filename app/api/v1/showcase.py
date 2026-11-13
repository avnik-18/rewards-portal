"""GET /awards/showcase — "Team highlights" carousel numbers (dashboard #5).

Identity: the shared app.core.actor actor dependency (Entra-enforced in
production, X-Demo-User only in the local dev environment) — one
actor-resolution rule, one place.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.showcase_repository import ShowcaseRepository
from app.schemas.showcase import JuryStatus, ShowcaseResponse
from app.services.showcase_service import ShowcaseService

router = APIRouter(tags=["awards"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> ShowcaseService:
    return ShowcaseService(ShowcaseRepository(session))


@router.get("/awards/showcase", response_model=ShowcaseResponse)
async def showcase(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[ShowcaseService, Depends(_service)],
) -> ShowcaseResponse:
    numbers = await service.showcase_numbers(actor_id=actor_id)
    jury = numbers["my_jury"]
    return ShowcaseResponse(
        days_to_nominations_close=numbers["days_to_nominations_close"],
        open_categories=numbers["open_categories"],
        cycle_prize_total=numbers["cycle_prize_total"],
        my_jury=JuryStatus(cast=jury["cast"], assigned=jury["assigned"]),
    )
