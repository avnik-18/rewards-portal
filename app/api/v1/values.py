"""GET /values — the recognition values catalog with nested templates.

Org-wide content (media.py precedent): the actor identity (get_actor_id)
gates the call but never scopes it — every authenticated caller reads the
same catalog, so the resolved actor is bound but not used.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.values_repository import ValuesRepository
from app.schemas.values import ValueRowResponse
from app.services.values_service import ValuesService

router = APIRouter(tags=["values"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> ValuesService:
    return ValuesService(ValuesRepository(session))


@router.get("/values", response_model=list[ValueRowResponse])
async def values(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[ValuesService, Depends(_service)],
) -> list[ValueRowResponse]:
    return await service.active_values()
