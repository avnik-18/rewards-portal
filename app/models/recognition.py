"""Recognition bounded context — values, templates, recognitions, recipients."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, Uuid, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, recipient_kind, recognition_kind, recognition_status


class EmidsValues(Base):
    __tablename__ = "emids_values"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    key: Mapped[str] = mapped_column(Text, unique=True)
    label: Mapped[str] = mapped_column(Text)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RecognitionTemplates(Base):
    __tablename__ = "recognition_templates"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    value_id: Mapped[UUID] = mapped_column(ForeignKey("emids_values.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    emoji: Mapped[str | None] = mapped_column(Text)
    art_json: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    prefill: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RecognitionHistory(Base):
    __tablename__ = "recognition_history"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(recognition_kind)
    from_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    value_id: Mapped[UUID | None] = mapped_column(ForeignKey("emids_values.id"))
    template_id: Mapped[UUID | None] = mapped_column(ForeignKey("recognition_templates.id"))
    message: Mapped[str] = mapped_column(Text)
    base_points: Mapped[int] = mapped_column(Integer)
    art_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(recognition_status, default="pending_approval")
    occurred_at: Mapped[datetime] = mapped_column(DateTime)
    idempotency_key: Mapped[UUID | None] = mapped_column(Uuid, unique=True)
    source_ref: Mapped[str | None] = mapped_column(Text)
    award_id: Mapped[UUID | None] = mapped_column(ForeignKey("awards.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class RecognitionRecipients(Base):
    __tablename__ = "recognition_recipients"

    recognition_id: Mapped[UUID] = mapped_column(
        ForeignKey("recognition_history.id", ondelete="CASCADE"), primary_key=True,
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    points: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(recipient_kind)


class RecognitionPending(Base):
    """Trigger-maintained projection of recognition_history.status = pending_approval.

    App code never writes this table directly.
    """

    __tablename__ = "recognition_pending"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    recognition_id: Mapped[UUID] = mapped_column(
        ForeignKey("recognition_history.id", ondelete="CASCADE"), unique=True,
    )
    pending_since: Mapped[datetime] = mapped_column(DateTime)
