"""Reads for /media — SQL only, no business rules, no HTTP errors."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class MediaRepository:
    """Read the placement registry (0020_media_asset) for the Home screen."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def live_hero(self) -> dict[str, Any] | None:
        """The single live hero carousel video, per the schema's documented
        reader live-rule (media_asset_active_idx comment): is_active AND
        effective_to IS NULL AND effective_from <= now(). The partial unique
        index can never admit two matches; LIMIT 1 stays as insurance."""
        result = await self._session.execute(
            text(
                "SELECT id, title, url, poster_url, cta_label, cta_url "
                "FROM media_asset "
                "WHERE kind = 'hero_carousel_video' AND is_active "
                "  AND effective_to IS NULL AND effective_from <= now() "
                "LIMIT 1"
            )
        )
        row = result.mappings().first()
        return dict(row) if row is not None else None
