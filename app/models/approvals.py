"""Approvals bounded context — routing rules, items, steps."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    approval_kind,
    approval_level,
    approval_status,
    approver_mode,
    approver_subject,
    step_status,
)


class ApprovalRule(Base):
    __tablename__ = "approval_rule"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(approval_kind)
    version: Mapped[int] = mapped_column(Integer, default=1)
    condition: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    min_points: Mapped[int | None] = mapped_column(Integer)
    max_points: Mapped[int | None] = mapped_column(Integer)
    priority: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ApprovalRuleStep(Base):
    __tablename__ = "approval_rule_step"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    rule_id: Mapped[UUID] = mapped_column(ForeignKey("approval_rule.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(SmallInteger)
    level: Mapped[str] = mapped_column(approval_level)
    subject: Mapped[str] = mapped_column(approver_subject)
    fixed_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    mode: Mapped[str] = mapped_column(approver_mode, default="ANY")
    sla_hours: Mapped[int | None] = mapped_column(Integer)
    escalation_target: Mapped[str | None] = mapped_column(Text)


class ApprovalItem(Base):
    __tablename__ = "approval_item"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(approval_kind)
    submitter_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    resubmitted_from: Mapped[UUID | None] = mapped_column(ForeignKey("approval_item.id"))
    rule_id: Mapped[UUID | None] = mapped_column(ForeignKey("approval_rule.id"))
    rule_version: Mapped[int | None] = mapped_column(Integer)
    recognition_id: Mapped[UUID | None] = mapped_column(ForeignKey("recognition_history.id"))
    nomination_id: Mapped[UUID | None] = mapped_column(ForeignKey("awards_nominations.id"))
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(approval_status, default="pending")
    decided_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime)
    idempotency_key: Mapped[UUID | None] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class ApprovalItemStep(Base):
    __tablename__ = "approval_item_step"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    approval_item_id: Mapped[UUID] = mapped_column(ForeignKey("approval_item.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(SmallInteger)
    level: Mapped[str] = mapped_column(approval_level)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    mode: Mapped[str] = mapped_column(approver_mode, default="ANY")
    sla_due: Mapped[datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(step_status, default="pending")
    decided_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime)
    note: Mapped[str | None] = mapped_column(Text)
