"""Admin media registry + feed-post ops (the "Hero & banners" + moderation
ops of the admin console). Persona gate: get_admin_id — 403 for non-admins.

PATCH semantics follow the console's contract: kind and is_active are not
patchable (is_active changes go through publish / retire)."""

from typing import Annotated
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.actor import get_admin_id
from app.db.session import get_session
from app.repositories.media_admin_repository import MediaAdminRepository
from app.schemas.media_admin import (
    AdminMediaAssetCreateRequest,
    AdminMediaAssetPatchRequest,
    AdminMediaAssetResponse,
    AdminPostPatchRequest,
    AdminPostRow,
    AdminPostsResponse,
)
from app.services.media_admin_service import MediaAdminDomainError, MediaAdminService

router = APIRouter(tags=["admin-media"])

log = structlog.get_logger(__name__)

_BAD_REQUEST = {"media_validation"}
_CONFLICT = {"hero_uniq_conflict"}
_NOT_FOUND = {"media_not_found", "post_not_found"}


def media_admin_domain_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, MediaAdminDomainError):
        raise exc
    code = exc.code
    if code in _BAD_REQUEST:
        status_code = status.HTTP_400_BAD_REQUEST
    elif code in _CONFLICT:
        status_code = status.HTTP_409_CONFLICT
    elif code in _NOT_FOUND:
        status_code = status.HTTP_404_NOT_FOUND
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    if status_code >= 500:
        log.error("media_admin.unmapped_domain_code", code=code, path=request.url.path)
    return JSONResponse(status_code=status_code, content={"detail": code})


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> MediaAdminService:
    return MediaAdminService(MediaAdminRepository(session))


@router.get("/admin/media/assets", response_model=list[AdminMediaAssetResponse])
async def list_media_assets(
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    kind: str | None = Query(default=None),
) -> list[AdminMediaAssetResponse]:
    return [AdminMediaAssetResponse.model_validate(r) for r in await service.list_assets(kind)]


@router.post("/admin/media/asset", response_model=AdminMediaAssetResponse,
             status_code=status.HTTP_201_CREATED)
async def create_media_asset(
    body: AdminMediaAssetCreateRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> AdminMediaAssetResponse:
    request.state.actor_id = actor_id
    return AdminMediaAssetResponse.model_validate(
        await service.create_asset(actor_id, body.model_dump()))


@router.patch("/admin/media/asset/{asset_id}", response_model=AdminMediaAssetResponse)
async def patch_media_asset(
    asset_id: UUID,
    body: AdminMediaAssetPatchRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> AdminMediaAssetResponse:
    request.state.actor_id = actor_id
    return AdminMediaAssetResponse.model_validate(
        await service.patch_asset(actor_id, asset_id, body.model_dump()))


@router.post("/admin/media/asset/{asset_id}/publish", status_code=status.HTTP_204_NO_CONTENT)
async def publish_media_asset(
    asset_id: UUID,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> None:
    request.state.actor_id = actor_id
    return await service.publish_asset(asset_id)


@router.delete("/admin/media/asset/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def retire_media_asset(
    asset_id: UUID,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> None:
    request.state.actor_id = actor_id
    return await service.retire_asset(asset_id)


@router.get("/admin/posts", response_model=AdminPostsResponse)
async def list_admin_posts(
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    limit: int = Query(default=100, ge=1, le=300),
) -> AdminPostsResponse:
    return AdminPostsResponse(
        posts=[AdminPostRow.model_validate(r) for r in await service.list_posts(limit)])


@router.delete("/admin/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def hide_admin_post(
    post_id: UUID,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> None:
    request.state.actor_id = actor_id
    return await service.hide_post(post_id)


@router.post("/admin/posts/{post_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_admin_post(
    post_id: UUID,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> None:
    request.state.actor_id = actor_id
    return await service.restore_post(post_id)


@router.patch("/admin/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def edit_admin_post(
    post_id: UUID,
    body: AdminPostPatchRequest,
    actor_id: Annotated[UUID, Depends(get_admin_id)],
    service: Annotated[MediaAdminService, Depends(_service)],
    request: Request,
) -> None:
    """Rewrite the story text a feed post shows. The feed re-reads the row,
    so the edit is live for every viewer immediately."""
    request.state.actor_id = actor_id
    return await service.edit_post(post_id, body.message)
