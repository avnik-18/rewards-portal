"""Portal media — the hero/banner placement registry (0020_media_asset).

Only the registry lives here: the media itself is on the CDN/blob store and
rows hold HTTPS links the admins swap.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, text
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

media_kind = PgEnum(
    "hero_carousel_video", "news_banner", name="media_kind", create_type=False,
)


class MediaAsset(Base):
    __tablename__ = "media_asset"
    __table_args__ = (
        CheckConstraint(r"url ~* '^https://'", name="media_asset_url_chk"),
        CheckConstraint(
            r"poster_url IS NULL OR poster_url ~* '^https://'",
            name="media_asset_poster_url_chk",
        ),
        CheckConstraint(
            r"cta_url IS NULL OR cta_url ~* '^https://'", name="media_asset_cta_url_chk"
        ),
        CheckConstraint(
            "cta_url IS NULL OR cta_label IS NOT NULL", name="media_asset_cta_pair_chk"
        ),
        CheckConstraint(
            "effective_to IS NULL OR effective_to > effective_from",
            name="media_asset_window_chk",
        ),
        Index(
            "media_asset_active_idx",
            "kind",
            "sort_order",
            postgresql_where=text("is_active AND effective_to IS NULL"),
        ),
        Index(
            "media_asset_hero_uniq",
            "kind",
            unique=True,
            postgresql_where=text(
                "kind = 'hero_carousel_video' AND is_active AND effective_to IS NULL"
            ),
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(media_kind)
    title: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    poster_url: Mapped[str | None] = mapped_column(Text)
    cta_label: Mapped[str | None] = mapped_column(Text)
    cta_url: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(DateTime)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    updated_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
