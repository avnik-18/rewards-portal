"""Notifications read-list + mark-read — the bell panel's data (deliverable #6 depth).

Identity: the shared app.core.actor actor dependency — one actor-resolution
rule, one place.

- GET  /notifications       → the caller's UNREAD, delivered notifications,
                              newest first; each row carries the giver's
                              visible name + points when it is a praise
                              (enriched read-side from the dedupe key — no
                              fn change, no migration).
- POST /notifications/read  → marks ALL of the caller's unread rows read
                              (read_at = now) — "read once, it disappears":
                              the panel refetches after this and the list is
                              empty, the badge is 0.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.notifications_list_repository import NotificationsListRepository
from app.services.notifications_list_service import NotificationsListService

router = APIRouter(tags=["notifications"])


def _list_service(session: Annotated[AsyncSession, Depends(get_session)]) -> NotificationsListService:
    return NotificationsListService(NotificationsListRepository(session))


class NotificationRow(BaseModel):
    """One unread feed item — praise rows carry both parties' names:
    praise_received → '<giver> recognised you (+N pts)'
    praise_sent     → 'You recognised <receiver>…' (receiver_count > 1 means
                      'and N-1 more')
    praise_cc       → '<giver> copied you — recognised <receiver>'"""

    id: UUID
    type: str
    giver_name: str | None = None
    receiver_name: str | None = None
    receiver_count: int = 0
    points: int | None = None
    message: str | None = None
    created_at: str


class MarkReadResponse(BaseModel):
    marked_read: int = 0


@router.get("/notifications", response_model=list[NotificationRow])
async def my_notifications(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NotificationsListService, Depends(_list_service)],
    limit: Annotated[int, Field(ge=1, le=50)] = 20,
) -> list[NotificationRow]:
    return [NotificationRow(**row) for row in await service.unread_feed(actor_id=actor_id, limit=limit)]


@router.post("/notifications/read", response_model=MarkReadResponse)
async def mark_all_read(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[NotificationsListService, Depends(_list_service)],
) -> MarkReadResponse:
    marked = await service.mark_all_read(actor_id=actor_id)
    return MarkReadResponse(marked_read=marked)
