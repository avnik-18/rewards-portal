"""GET /media/hero — the Home screen's hero-section video.

Org-wide published content: the actor identity (get_actor_id) gates the call
but never scopes it — every authenticated caller reads the same media. The
rows are the placement registry (0020_media_asset): the media itself lives on
the CDN and admins swap links, so any live row is guaranteed https and (if it
has an action) CTA-paired by the table's CHECKs.

No live hero (registry empty, deactivated, expired window, or only
future-dated) is the 404 hero_not_published contract — the frontend falls
back to a static asset on it. A hero mid-window that overlaps the evergreen
one is served in its place (display-window semantics — see
MediaRepository.live_hero for the decided rule)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_actor_id
from app.db.session import get_session
from app.repositories.media_repository import MediaRepository
from app.schemas.media import MediaHeroResponse
from app.services.media_service import MediaService

router = APIRouter(tags=["media"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> MediaService:
    return MediaService(MediaRepository(session))


@router.get("/media/hero", response_model=MediaHeroResponse)
async def hero(
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[MediaService, Depends(_service)],
) -> MediaHeroResponse:
    hero_row = await service.hero()
    if hero_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="hero_not_published",
        )
    return MediaHeroResponse.model_validate(hero_row)
