"""Admin media-registry + feed-post ops — thin over MediaAdminRepository.

Failures surface as MediaAdminDomainError carrying stable codes:
- media_not_found / post_not_found
- media_validation  (DB CHECK rejections: non-https url, CTA pairing)
- hero_uniq_conflict (a second evergreen hero row while its peer is live)
The router maps codes to HTTP once."""

from typing import Any
from uuid import UUID

import sqlalchemy.exc

from app.repositories.media_admin_repository import MediaAdminRepository


class MediaAdminDomainError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


class MediaAdminService:
    def __init__(self, repo: MediaAdminRepository) -> None:
        self._repo = repo

    async def list_assets(self, kind: str | None) -> list[dict[str, Any]]:
        return await self._repo.list_assets(kind)

    async def create_asset(self, actor_id: UUID, body: dict[str, Any]) -> dict[str, Any]:
        try:
            return await self._repo.create_asset(
                actor_id, body["kind"], body["title"], body["url"],
                body["poster_url"], body["cta_label"], body["cta_url"],
                body["sort_order"], body["is_active"])
        except sqlalchemy.exc.IntegrityError as exc:
            raise self._db_error(exc) from exc

    async def patch_asset(self, actor_id: UUID, asset_id: UUID,
                          body: dict[str, Any]) -> dict[str, Any]:
        allowed = {k: v for k, v in body.items() if v is not None and v != {}}
        try:
            row = await self._repo.patch_asset(actor_id, asset_id, allowed)
        except sqlalchemy.exc.IntegrityError as exc:
            raise self._db_error(exc) from exc
        if row is None:
            raise MediaAdminDomainError("media_not_found")
        return row

    async def publish_asset(self, asset_id: UUID) -> None:
        kind = await self._repo.publish_asset(asset_id)
        if kind is None:
            raise MediaAdminDomainError("media_not_found")

    async def retire_asset(self, asset_id: UUID) -> None:
        if not await self._repo.retire_asset(asset_id):
            raise MediaAdminDomainError("media_not_found")

    async def list_posts(self, limit: int) -> list[dict[str, Any]]:
        return await self._repo.list_posts(limit)

    async def hide_post(self, post_id: UUID) -> None:
        if not await self._repo.hide_post(post_id):
            raise MediaAdminDomainError("post_not_found")

    async def restore_post(self, post_id: UUID) -> None:
        if not await self._repo.restore_post(post_id):
            raise MediaAdminDomainError("post_not_found")

    async def edit_post(self, post_id: UUID, message: str) -> None:
        if not await self._repo.edit_post(post_id, message):
            raise MediaAdminDomainError("post_not_found")

    @staticmethod
    def _db_error(exc: sqlalchemy.exc.IntegrityError) -> MediaAdminDomainError:
        text = str(exc).lower()
        if "media_asset_url_chk" in text or "poster_url_chk" in text or "cta_url_chk" in text:
            return MediaAdminDomainError("media_validation")
        if "cta_pair_chk" in text:
            return MediaAdminDomainError("media_validation")
        if "hero_uniq" in text:
            return MediaAdminDomainError("hero_uniq_conflict")
        return MediaAdminDomainError("media_validation")
