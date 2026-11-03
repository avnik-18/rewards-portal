"""GET /notifications/unread-count — the bell red badge (dashboard #6).

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
from app.repositories.notifications_repository import NotificationsRepository
from app.schemas.notifications import UnreadCountResponse
from app.services.notifications_service import NotificationsService

router = APIRouter(tags=["notifications"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> NotificationsService:
    return NotificationsService(NotificationsRepository(session))


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NotificationsService, Depends(_service)],
) -> UnreadCountResponse:
    return await service.unread_count(caller_id=actor_id)
