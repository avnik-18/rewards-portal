"""Feed bounded context — published feed_post projection rows."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class FeedPost(Base):
    __tablename__ = "feed_post"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(Text)
    entity_type: Mapped[str] = mapped_column(Text)
    entity_id: Mapped[UUID] = mapped_column(Uuid)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("now()"))
    is_bu: Mapped[bool] = mapped_column(Boolean, default=False)
