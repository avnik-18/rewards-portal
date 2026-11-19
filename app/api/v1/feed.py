"""GET /feed — persona-segmented recognition feed (dashboard deliverable).

Identity: the shared app.core.actor actor dependency (Entra-enforced in
production, X-Demo-User only in the local dev environment) — one
actor-resolution rule, one place.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.feed_repository import FeedRepository
from app.schemas.feed import (
    FeedCursor,
    FeedPostResponse,
    FeedResponse,
    FeedTier,
)
from app.services.feed_service import FeedService

router = APIRouter(tags=["feed"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> FeedService:
    return FeedService(FeedRepository(session))


@router.get("/feed", response_model=FeedResponse)
async def feed(
    request: Request,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[FeedService, Depends(_service)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    cursor_tier: Annotated[FeedTier | None, Query()] = None,
    cursor_at: Annotated[datetime | None, Query()] = None,
    cursor_recognition_id: Annotated[UUID | None, Query()] = None,
) -> FeedResponse:
    request.state.actor_id = actor_id
    tier_cursor = all(parameter is not None for parameter in (cursor_tier, cursor_at, cursor_recognition_id))
    tier_absent = all(parameter is None for parameter in (cursor_tier, cursor_at, cursor_recognition_id))
    if not tier_cursor and not tier_absent:
        raise HTTPException(status_code=422, detail="partial_cursor")
    cursor = (
        FeedCursor(
            tier=cursor_tier,
            occurred_at=cursor_at,
            recognition_id=cursor_recognition_id,
        )
        if tier_cursor
        else None
    )
    persona = await service.persona(actor_id)
    items, next_cursor = await service.feed_page(actor_id, limit, cursor)
    return FeedResponse(
        persona=persona,
        items=[FeedPostResponse.model_validate(row) for row in items],
        next_cursor=next_cursor,
    )
