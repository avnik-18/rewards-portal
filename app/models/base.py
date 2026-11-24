"""Shared declarative base + PgEnums for all bounded-context model modules."""

from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import DeclarativeBase

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
award_cadence = PgEnum(
    "monthly", "quarterly", "annual",
    name="award_cadence", create_type=False,
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
journal_status = PgEnum(
    "posted", "void", name="journal_status", create_type=False,
)

notification_type = PgEnum(
    "praise_received", "approval_pending", "approval_decided", "award_updates",
    "milestone", "redemption", "admin_announcement",
    name="notification_type", create_type=False,
)
notification_channel = PgEnum(
    "in_app", "email", "slack", name="notification_channel", create_type=False,
)
delivery_status = PgEnum("queued", "sent", "failed", "read", name="delivery_status", create_type=False)
outbox_aggregate = PgEnum(
    "recognition", "approval", "award", "admin", "ledger", name="outbox_aggregate",
    create_type=False,
)
outbox_status = PgEnum("pending", "sent", "failed", name="outbox_status", create_type=False)
log_level_type = PgEnum("debug", "info", "warn", "error", name="log_level", create_type=False)
job_status = PgEnum(
    "running", "succeeded", "failed", "timed_out", name="job_status", create_type=False,
)
setting_data_type = PgEnum("bool", "int", "text", name="setting_data_type", create_type=False)


class Base(DeclarativeBase):
    pass
