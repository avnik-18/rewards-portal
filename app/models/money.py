"""Money bounded context — fiscal periods, allowances, wallets, double-entry ledger."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, account_kind, journal_direction, journal_kind, journal_status


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
    role_band_employee: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    quarterly_allowance: Mapped[int] = mapped_column(Integer, CheckConstraint("quarterly_allowance > 0"))
    recipient_cap_per_period: Mapped[int | None] = mapped_column(Integer)
    carry_over: Mapped[bool] = mapped_column(Boolean, default=False)
    effective_from: Mapped[date] = mapped_column(Date)
    effective_to: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
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
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    wallet_id: Mapped[UUID | None] = mapped_column(ForeignKey("points_wallet.id"))
    allowance_id: Mapped[UUID | None] = mapped_column(ForeignKey("to_recog_points.id"))


class JournalEntry(Base):
    """One atomic money event — the journal header."""

    __tablename__ = "journal_entry"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    kind: Mapped[str] = mapped_column(journal_kind)
    memo: Mapped[str | None] = mapped_column(Text)
    linked_recognition_id: Mapped[UUID | None] = mapped_column(ForeignKey("recognition_history.id"))
    linked_award_id: Mapped[UUID | None] = mapped_column(ForeignKey("awards.id"))
    linked_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    reverses: Mapped[UUID | None] = mapped_column(ForeignKey("journal_entry.id"))
    reason: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(journal_status)
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
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
    to_recog_points_id: Mapped[UUID | None] = mapped_column(ForeignKey("to_recog_points.id"))
    points_wallet_id: Mapped[UUID | None] = mapped_column(ForeignKey("points_wallet.id"))
    kind: Mapped[str] = mapped_column(Text)
    amount: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(Text)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    created_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime)
