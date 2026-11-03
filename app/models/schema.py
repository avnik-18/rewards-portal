"""Applause database models — mirror of the alembic-authored schema.

GENERATED MIRROR — never hand-edit. The schema owner is `alembic/versions/`
(DB-first, SQL-authored; see docs/db/design-source/README.md). Model classes
serve ORM reads and future `alembic.autogenerate`-free comparisons; the money
invariants and business rules live in SQL functions (fn_submit_recognition,
fn_item_decide, fn_admin_set_budget, fn_finalize_award — see db/README.md).

Regenerate after model revisions land: `db/scripts/gen_models.py` will be
restored for that (currently hand-mirrored — see PR description).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    text,
    UniqueConstraint,
)
from sqlalchemy import Uuid
from sqlalchemy.dialects.postgresql import JSONB, ENUM as PgEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

person_status = PgEnum(
    "active", "probation", "onleave", "paused", "notice", "separated",
    name="person_status", create_type=False,
)
person_source = PgEnum("internal", "guest", name="person_source", create_type=False)
app_role = PgEnum(
    "admin", "finance", "hr", "jury_member", "system", name="app_role", create_type=False,
)
team_member_role = PgEnum("lead", "member", name="team_member_role", create_type=False)
recognition_kind = PgEnum(
    "praise", "milestone", "welcome", "award", name="recognition_kind", create_type=False,
)
recognition_status = PgEnum(
    "pending_approval", "approved", "declined", "returned", "cancelled",
    name="recognition_status", create_type=False,
)
recipient_kind = PgEnum("to", "cc", name="recipient_kind", create_type=False)
approval_kind = PgEnum(
    "points_recognition", "award_endorsement", name="approval_kind", create_type=False,
)
approval_level = PgEnum("L1", "L2", "L3", "FINANCE", name="approval_level", create_type=False)
approver_subject = PgEnum(
    "submitter_manager", "submitter_manager_manager", "recipient_manager", "fixed_user",
    name="approver_subject", create_type=False,
)
approver_mode = PgEnum("ANY", "ALL", name="approver_mode", create_type=False)
approval_status = PgEnum(
    "pending", "approved", "returned", "declined", "cancelled",
    name="approval_status", create_type=False,
)
step_status = PgEnum(
    "pending", "approved", "declined", "returned", "skipped", "escalated",
    name="step_status", create_type=False,
)
delegation_scope = PgEnum(
    "all", "finance", "award_endorsement", name="delegation_scope", create_type=False,
)
cycle_phase = PgEnum(
    "draft", "nominations", "voting", "result", "closed", "cancelled",
    name="cycle_phase", create_type=False,
)
nomination_status = PgEnum(
    "submitted", "endorsed", "under_review", "returned", "result", "not_selected",
    name="nomination_status", create_type=False,
)
account_kind = PgEnum("user_wallet", "system", name="account_kind", create_type=False)
journal_kind = PgEnum(
    "allowance_seed", "recognition_hold", "recognition_release", "recognition_refund",
    "payout", "grant", "earning", "milestone", "welcome", "adjustment", "reversal",
    "expiry", "deactiv_refund",
    name="journal_kind", create_type=False,
)
journal_direction = PgEnum("debit", "credit", name="journal_direction", create_type=False)
notification_type = PgEnum(
    "praise_received", "approval_pending", "approval_decided", "award_updates",
    "milestone", "redemption", "admin_announcement",
    name="notification_type", create_type=False,
)
notification_channel = PgEnum("in_app", "email", "slack",
    name="notification_channel", create_type=False,
)
delivery_status = PgEnum("queued", "sent", "failed", "read",
    name="delivery_status", create_type=False,
)
outbox_aggregate = PgEnum(
    "recognition", "approval", "award", "admin", "ledger", name="outbox_aggregate",
    create_type=False,
)
outbox_status = PgEnum("pending", "sent", "failed", name="outbox_status", create_type=False)
log_level = PgEnum("debug", "info", "warn", "error", name="log_level", create_type=False)
job_status = PgEnum(
    "running", "succeeded", "failed", "timed_out", name="job_status", create_type=False,
)
setting_data_type = PgEnum("bool", "int", "text", name="setting_data_type", create_type=False)


class Base(DeclarativeBase):
    pass


class Users(Base):
    """Employee/person record + the org tree (self-FK)."""

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    employee_code: Mapped[str] = mapped_column(String, unique=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    external_id: Mapped[Optional[str]] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text)
    title: Mapped[Optional[str]] = mapped_column(Text)
    department: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    joined_on: Mapped[Optional[date]] = mapped_column(Date)
    manager_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    manager_effective_from: Mapped[datetime] = mapped_column(DateTime)
    employment_status: Mapped[str] = mapped_column(person_status, default="active")
    source: Mapped[str] = mapped_column(person_source, default="internal")
    recognition_eligible: Mapped[Optional[bool]] = mapped_column(Boolean)
    recognition_eligible_effective_from: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class Teams(Base):
    __tablename__ = "teams"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(Text, unique=True)
    code: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    project_name: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class TeamMembers(Base):
    __tablename__ = "team_members"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    team_id: Mapped[UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(team_member_role, default="member")
    valid_from: Mapped[date] = mapped_column(Date)
    valid_to: Mapped[Optional[date]] = mapped_column(Date)


class RoleAssignment(Base):
    __tablename__ = "role_assignment"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(app_role)
    granted_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    granted_at: Mapped[datetime] = mapped_column(DateTime)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class FiscalPeriod(Base):
    __tablename__ = "fiscal_period"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(Text, unique=True)
    starts: Mapped[date] = mapped_column(Date, unique=True)
    ends: Mapped[date] = mapped_column(Date)


class BudgetPolicy(Base):
    __tablename__ = "budget_policy"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    grants: Mapped[str] = mapped_column(Text)
    role_band_employee: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    quarterly_allowance: Mapped[int] = mapped_column(Integer, CheckConstraint("quarterly_allowance > 0"))
    recipient_cap_per_period: Mapped[Optional[int]] = mapped_column(Integer)
    carry_over: Mapped[bool] = mapped_column(Boolean, default=False)
    effective_from: Mapped[date] = mapped_column(Date)
    effective_to: Mapped[Optional[date]] = mapped_column(Date)
    created_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ToRecogPoints(Base):
    """Quarterly recognition-send allowance (the giver's spend currency)."""

    __tablename__ = "to_recog_points"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    period_id: Mapped[UUID] = mapped_column(ForeignKey("fiscal_period.id", ondelete="RESTRICT"))
    allocated: Mapped[int] = mapped_column(Integer)
    balance: Mapped[int] = mapped_column(Integer)


class PointsWallet(Base):
    __tablename__ = "points_wallet"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    balance: Mapped[int] = mapped_column(Integer)


class LedgerAccount(Base):
    __tablename__ = "ledger_account"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(Text, unique=True)
    kind: Mapped[str] = mapped_column(account_kind)
    user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    wallet: Mapped[Optional[UUID]] = mapped_column(ForeignKey("points_wallet.id"))
    allowance: Mapped[Optional[UUID]] = mapped_column(ForeignKey("to_recog_points.id"))


class JournalEntry(Base):
    __tablename__ = "journal_entry"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(journal_kind)
    memo: Mapped[Optional[str]] = mapped_column(Text)
    linked_recognition_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("recognition_history.id"))
    linked_award_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("awards.id"))
    linked_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    reverses: Mapped[Optional[UUID]] = mapped_column(ForeignKey("journal_entry.id"))
    reason: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text)
    created_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class JournalLine(Base):
    __tablename__ = "journal_line"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    journal_id: Mapped[UUID] = mapped_column(ForeignKey("journal_entry.id", ondelete="CASCADE"))
    account_id: Mapped[UUID] = mapped_column(ForeignKey("ledger_account.id"))
    direction: Mapped[str] = mapped_column(journal_direction)
    amount: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class Ledger(Base):
    """Book of record for wallet balances — append-only."""

    __tablename__ = "ledger"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    journal_id: Mapped[UUID] = mapped_column(ForeignKey("journal_entry.id", ondelete="CASCADE"))
    to_recog_points_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("to_recog_points.id"))
    points_wallet_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("points_wallet.id"))
    kind: Mapped[str] = mapped_column(Text)
    amount: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(Text)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)


class EmidsValues(Base):
    __tablename__ = "emids_values"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    key: Mapped[str] = mapped_column(Text, unique=True)
    label: Mapped[str] = mapped_column(Text)
    meta: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RecognitionTemplates(Base):
    __tablename__ = "recognition_templates"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    value_id: Mapped[UUID] = mapped_column(ForeignKey("emids_values.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    emoji: Mapped[Optional[str]] = mapped_column(Text)
    art_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    prefill: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RecognitionHistory(Base):
    __tablename__ = "recognition_history"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(recognition_kind)
    from_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    value_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("emids_values.id"))
    template_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("recognition_templates.id"))
    message: Mapped[str] = mapped_column(Text)
    base_points: Mapped[int] = mapped_column(Integer)
    art_url: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(recognition_status, default="pending_approval")
    occurred_at: Mapped[datetime] = mapped_column(DateTime)
    idempotency_key: Mapped[Optional[UUID]] = mapped_column(Uuid, unique=True)
    source_ref: Mapped[Optional[str]] = mapped_column(Text)
    award_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("awards.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class RecognitionRecipients(Base):
    __tablename__ = "recognition_recipients"

    recognition_id: Mapped[UUID] = mapped_column(
        ForeignKey("recognition_history.id", ondelete="CASCADE"), primary_key=True
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
        ForeignKey("recognition_history.id", ondelete="CASCADE"), unique=True
    )
    pending_since: Mapped[datetime] = mapped_column(DateTime)


class ApprovalRule(Base):
    __tablename__ = "approval_rule"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(approval_kind)
    version: Mapped[int] = mapped_column(Integer, default=1)
    condition: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    min_points: Mapped[Optional[int]] = mapped_column(Integer)
    max_points: Mapped[Optional[int]] = mapped_column(Integer)
    priority: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version_note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class ApprovalRuleStep(Base):
    __tablename__ = "approval_rule_step"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    rule_id: Mapped[UUID] = mapped_column(ForeignKey("approval_rule.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(SmallInteger)
    level: Mapped[str] = mapped_column(approval_level)
    subject: Mapped[str] = mapped_column(approver_subject)
    fixed_user_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    mode: Mapped[str] = mapped_column(approver_mode, default="ANY")
    sla_hours: Mapped[Optional[int]] = mapped_column(Integer)
    escalation_target: Mapped[Optional[str]] = mapped_column(Text)


class ApprovalItem(Base):
    __tablename__ = "approval_item"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(approval_kind)
    submitter_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    resubmitted_from: Mapped[Optional[UUID]] = mapped_column(ForeignKey("approval_item.id"))
    rule_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("approval_rule.id"))
    rule_version: Mapped[Optional[int]] = mapped_column(Integer)
    recognition_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("recognition_history.id"))
    nomination_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("awards_nominations.id"))
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(approval_status, default="pending")
    decided_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    idempotency_key: Mapped[Optional[UUID]] = mapped_column(Uuid, unique=True)
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
    sla_due: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(step_status, default="pending")
    decided_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    note: Mapped[Optional[str]] = mapped_column(Text)


class ApprovalDelegation(Base):
    __tablename__ = "approval_delegation"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    delegator_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    delegate_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    valid_from: Mapped[datetime] = mapped_column(DateTime)
    valid_to: Mapped[Optional[datetime]] = mapped_column(DateTime)
    scope: Mapped[str] = mapped_column(delegation_scope, default="all")
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class Awards(Base):
    __tablename__ = "awards"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    period_id: Mapped[UUID] = mapped_column(ForeignKey("fiscal_period.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    value_id: Mapped[Optional[UUID]] = mapped_column(ForeignKey("emids_values.id"))
    prize_points: Mapped[int] = mapped_column(Integer)
    max_nominations_per_nominator: Mapped[int] = mapped_column(Integer)
    requires_jury: Mapped[bool] = mapped_column(Boolean, default=True)
    phase: Mapped[str] = mapped_column(cycle_phase, default="draft")
    nominations_end: Mapped[Optional[date]] = mapped_column(Date)
    voting_end: Mapped[Optional[date]] = mapped_column(Date)
    winner_nomination_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("awards_nominations.id"), unique=True
    )
    winner_payout_points: Mapped[Optional[int]] = mapped_column(Integer)
    decided_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class AwardsNominations(Base):
    __tablename__ = "awards_nominations"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    award_id: Mapped[UUID] = mapped_column(ForeignKey("awards.id", ondelete="CASCADE"))
    nominee_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    nominator_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    story: Mapped[str] = mapped_column(Text)
    is_self_nomination: Mapped[bool] = mapped_column(Boolean, default=False)
    shortlisted: Mapped[Optional[bool]] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(nomination_status, default="submitted")
    flags: Mapped[Optional[list[str]]] = mapped_column(JSONB)
    decided_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class JuryAssignment(Base):
    __tablename__ = "jury_assignment"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    award_id: Mapped[UUID] = mapped_column(ForeignKey("awards.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    granted_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    granted_at: Mapped[datetime] = mapped_column(DateTime)


class Ballot(Base):
    __tablename__ = "ballot"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nomination_id: Mapped[UUID] = mapped_column(ForeignKey("awards_nominations.id", ondelete="CASCADE"))
    juror_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    score: Mapped[int] = mapped_column(SmallInteger)
    note: Mapped[Optional[str]] = mapped_column(Text)
    voted_at: Mapped[datetime] = mapped_column(DateTime)


class Notification(Base):
    __tablename__ = "notification"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(notification_type)
    channel: Mapped[str] = mapped_column(notification_channel, default="in_app")
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    delivery_status: Mapped[str] = mapped_column(delivery_status, default="queued")
    dedupe_key: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class OutboxEvent(Base):
    __tablename__ = "outbox_event"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    aggregate: Mapped[str] = mapped_column(outbox_aggregate)
    aggregate_id: Mapped[str] = mapped_column(Text)
    event_type: Mapped[str] = mapped_column(Text)
    payload: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(outbox_status, default="pending")
    attempts: Mapped[int] = mapped_column(Integer)
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    dedupe_key: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    relayed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class AdminSettingKey(Base):
    __tablename__ = "admin_setting_key"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    label: Mapped[str] = mapped_column(Text)
    data_type: Mapped[str] = mapped_column(setting_data_type)
    allowed_range: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    is_program_policy: Mapped[bool] = mapped_column(Boolean, default=False)


class AdminSetting(Base):
    __tablename__ = "admin_setting"

    key: Mapped[str] = mapped_column(ForeignKey("admin_setting_key.key"), primary_key=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSONB)
    updated_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
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
    actor: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(Text)
    entity: Mapped[str] = mapped_column(Text)
    entity_id: Mapped[Optional[str]] = mapped_column(Text)
    before: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    after: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    at: Mapped[datetime] = mapped_column(DateTime)
