"""System bounded context — notifications, outbox, admin settings, audit log."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    delivery_status,
    notification_channel,
    notification_type,
    outbox_aggregate,
    outbox_status,
    setting_data_type,
)


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(notification_type)
    channel: Mapped[str] = mapped_column(notification_channel, default="in_app")
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    delivery_status: Mapped[str] = mapped_column(delivery_status, default="queued")
    dedupe_key: Mapped[str | None] = mapped_column(Text, unique=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OutboxEvent(Base):
    __tablename__ = "outbox_event"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    aggregate: Mapped[str] = mapped_column(outbox_aggregate)
    aggregate_id: Mapped[str] = mapped_column(Text)
    event_type: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(outbox_status, default="pending")
    attempts: Mapped[int] = mapped_column(Integer)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    dedupe_key: Mapped[str | None] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    relayed_at: Mapped[datetime | None] = mapped_column(DateTime)


class AdminSettingKey(Base):
    __tablename__ = "admin_setting_key"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    label: Mapped[str] = mapped_column(Text)
    data_type: Mapped[str] = mapped_column(setting_data_type)
    allowed_range: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_program_policy: Mapped[bool] = mapped_column(Boolean, default=False)


class AdminSetting(Base):
    __tablename__ = "admin_setting"

    key: Mapped[str] = mapped_column(ForeignKey("admin_setting_key.key"), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB)
    updated_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class MilestoneRule(Base):
    __tablename__ = "milestone_rule"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    trigger: Mapped[str] = mapped_column(Text)
    years: Mapped[int] = mapped_column(Integer, default=0)
    points: Mapped[int] = mapped_column(Integer)
    posts_to_feed: Mapped[bool] = mapped_column(Boolean, default=False)
    awards_banner: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    actor: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(Text)
    entity: Mapped[str] = mapped_column(Text)
    entity_id: Mapped[str | None] = mapped_column(Text)
    before: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    after: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    at: Mapped[datetime] = mapped_column(DateTime)
