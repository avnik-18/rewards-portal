"""Reads for /media — SQL only, no business rules, no HTTP errors."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class MediaRepository:
    """Read the placement registry (0020_media_asset) for the Home screen."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def live_hero(self) -> dict[str, Any] | None:
        """The single live hero carousel video, under the DECIDED reader
        rule (decision record: display-window semantics — this widens the
        0020 index comment's draft rule 'effective_to IS NULL', which made
        a hero with any retirement date invisible mid-window):

          is_active AND effective_from <= now()
            AND (effective_to IS NULL OR effective_to > now())

        Candidates overlap by design once the end date counts in (the
        partial unique index only constrains unwindowed heroes), so the
        precedence is deterministic: a MID-WINDOW campaign hero outranks
        the evergreen one, then sort_order, then newest. Revisit with the
        schema owner if the index predicate itself is ever extended."""
        result = await self._session.execute(
            text(
                "SELECT id, title, url, poster_url, cta_label, cta_url "
                "FROM media_asset "
                "WHERE kind = 'hero_carousel_video' AND is_active "
                "  AND effective_from <= now() "
                "  AND (effective_to IS NULL OR effective_to > now()) "
                "ORDER BY (effective_to IS NOT NULL) DESC, sort_order, "
                "         created_at DESC "
                "LIMIT 1"
            )
        )
        row = result.mappings().first()
        return dict(row) if row is not None else None
