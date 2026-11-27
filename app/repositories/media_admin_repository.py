"""Admin writes + reads on the placement registry (0020_media_asset) and the
feed-post moderation ops (0023). SQL only — rules (url checks, hero singleton,
one-active-hero-per-kind) live in DB constraints; code maps failures to codes."""

from collections.abc import Mapping as abc_Mapping
from typing import Any, cast
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

_TEXT = sa.text


def row_dict(row: Any) -> dict[str, Any]:
    # mappings() rows implement Mapping; plain Rows expose ._mapping
    return dict(row) if isinstance(row, abc_Mapping) else dict(row._mapping)


class MediaAdminRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------- media

    async def list_assets(self, kind: str | None = None) -> list[dict[str, Any]]:
        sql = (
            "SELECT id, kind::text AS kind, title, url, poster_url, cta_label, cta_url, "
            "sort_order, is_active, effective_from, effective_to, created_at, updated_at "
            "FROM media_asset "
            + ("WHERE kind = CAST(:kind AS media_kind) " if kind else "")
            + "ORDER BY kind, sort_order, created_at DESC"
        )
        res = await self._session.execute(_TEXT(sql), dict(kind=kind or ""))
        return [row_dict(r) for r in res.mappings().all()]

    async def create_asset(
        self, actor_id: UUID, kind: str, title: str, url: str,
        poster_url: str | None, cta_label: str | None, cta_url: str | None,
        sort_order: int, is_active: bool,
    ) -> dict[str, Any]:
        res = await self._session.execute(_TEXT(
            """
            INSERT INTO media_asset
                (kind, title, url, poster_url, cta_label, cta_url,
                 sort_order, is_active, created_by, updated_by)
            VALUES (CAST(:kind AS media_kind), :title, :url, :poster, :cta_label, :cta_url,
                    :sort, :active, :actor, :actor)
            RETURNING id, kind::text AS kind, title, url, poster_url, cta_label, cta_url,
                      sort_order, is_active, effective_from, effective_to,
                      created_at, updated_at
            """),
            dict(kind=kind, title=title, url=url, poster=poster_url,
                 cta_label=cta_label, cta_url=cta_url, sort=sort_order,
                 active=bool(is_active), actor=str(actor_id)))
        return row_dict(res.one())

    async def patch_asset(
        self, actor_id: UUID, asset_id: UUID, fields: dict[str, Any],
    ) -> dict[str, Any] | None:
        sets = []
        params: dict[str, Any] = {"aid": str(asset_id), "actor": str(actor_id)}
        for i, (col, val) in enumerate(fields.items()):
            sets.append(f"{col} = :f{i}")
            params[f"f{i}"] = val
        if not sets:
            res = await self._session.execute(_TEXT(
                "SELECT id, kind::text AS kind, title, url, poster_url, cta_label, cta_url, "
                "sort_order, is_active, effective_from, effective_to, created_at, updated_at "
                "FROM media_asset WHERE id = :aid"), params)
            row = res.mappings().first()
            return row_dict(row) if row else None
        res = await self._session.execute(_TEXT(
            "UPDATE media_asset SET " + ", ".join(sets) + ", updated_by = :actor "
            "WHERE id = :aid "
            "RETURNING id, kind::text AS kind, title, url, poster_url, cta_label, cta_url, "
            "sort_order, is_active, effective_from, effective_to, created_at, updated_at"),
            params)
        row = cast(Any, res).mappings().first()
        return row_dict(row) if row else None

    async def publish_asset(self, asset_id: UUID) -> str | None:
        """Make this row the live placement of its kind: the previous active
        row (if any) is retired in the same transaction."""
        row = await self._session.execute(_TEXT(
            "SELECT kind::text AS kind FROM media_asset WHERE id = :aid"),
            dict(aid=str(asset_id)))
        first = row.mappings().first()
        if first is None:
            return None
        kind = first["kind"]
        await self._session.execute(_TEXT(
            "UPDATE media_asset SET is_active = false, effective_to = now() "
            "WHERE kind = CAST(:kind AS media_kind) AND is_active AND id <> :aid"),
            dict(kind=kind, aid=str(asset_id)))
        await self._session.execute(_TEXT(
            "UPDATE media_asset SET is_active = true, effective_to = NULL, "
            "effective_from = now() WHERE id = :aid"),
            dict(aid=str(asset_id)))
        return kind

    async def retire_asset(self, asset_id: UUID) -> bool:
        res = await self._session.execute(_TEXT(
            "UPDATE media_asset SET is_active = false, effective_to = now() "
            "WHERE id = :aid"),
            dict(aid=str(asset_id)))
        return int(cast(Any, res).rowcount or 0) > 0

    # ------------------------------------------------------------- posts

    async def list_posts(self, limit: int = 100) -> list[dict[str, Any]]:
        res = await self._session.execute(_TEXT(
            """
            SELECT fp.id, fp.kind, fp.entity_type, fp.is_public, fp.occurred_at,
                   a.full_name AS actor_name, a.employee_code AS actor_code,
                   COALESCE(rh.message, '') AS message,
                   COALESCE(rh.base_points, 0) AS post_points,
                   (SELECT count(*) FROM recognition_recipients rr
                     WHERE rr.recognition_id = fp.entity_id) AS recipient_count
              FROM feed_post fp
              LEFT JOIN recognition_history rh ON
                    fp.entity_type = 'recognition' AND rh.id = fp.entity_id
              LEFT JOIN users a ON a.id = fp.actor_id
             ORDER BY fp.occurred_at DESC
             LIMIT :lim
            """),
            dict(lim=limit))
        return [row_dict(r) for r in res.mappings().all()]

    async def get_post(self, post_id: UUID) -> dict[str, Any] | None:
        res = await self._session.execute(_TEXT(
            "SELECT id, kind, entity_type, entity_id, is_public FROM feed_post WHERE id = :pid"),
            dict(pid=str(post_id)))
        row = res.mappings().first()
        return row_dict(row) if row else None

    async def hide_post(self, post_id: UUID) -> bool:
        res = await self._session.execute(_TEXT(
            "UPDATE feed_post SET is_public = false WHERE id = :pid"),
            dict(pid=str(post_id)))
        return int(cast(Any, res).rowcount or 0) > 0

    async def restore_post(self, post_id: UUID) -> bool:
        res = await self._session.execute(_TEXT(
            "UPDATE feed_post SET is_public = true WHERE id = :pid"),
            dict(pid=str(post_id)))
        return int(cast(Any, res).rowcount or 0) > 0

    async def edit_post(self, post_id: UUID, message: str) -> dict[str, Any] | None:
        """Rewrite the text a post shows — only recognition-backed posts carry
        an editable story; the feed_post row itself stays untouched."""
        res = await self._session.execute(_TEXT(
            """
            UPDATE recognition_history rh
               SET message = :msg
              FROM feed_post fp
             WHERE fp.id = :pid
               AND fp.entity_type = 'recognition'
               AND rh.id = fp.entity_id
            RETURNING rh.id, rh.message
            """),
            dict(pid=str(post_id), msg=message))
        row = res.mappings().first()
        return row_dict(row) if row else None
