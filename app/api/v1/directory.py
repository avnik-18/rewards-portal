"""GET /people — the recognition-eligible directory (bare list, no wrapper).

Identity: the shared app.core.actor actor dependency (Entra-enforced in
production, X-Demo-User only in the local dev environment) — one
actor-resolution rule, one place. The actor is excluded from the results so
nobody recognizes themselves from the picker.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.directory_repository import DirectoryRepository
from app.schemas.directory import PersonRowResponse
from app.services.directory_service import DirectoryService

router = APIRouter(tags=["people"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> DirectoryService:
    return DirectoryService(DirectoryRepository(session))


@router.get("/people", response_model=list[PersonRowResponse])
async def people(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[DirectoryService, Depends(_service)],
    limit: Annotated[int, Query(ge=1, le=1000)] = 500,
    search: Annotated[str | None, Query(max_length=100)] = None,
) -> list[PersonRowResponse]:
    rows = await service.list_people(actor_id=actor_id, limit=limit, search=search)
    return [PersonRowResponse(**row) for row in rows]
