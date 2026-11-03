"""Awards bounded context — EoQ campaigns, nominations, jury, ballots."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, SmallInteger, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, cycle_phase, nomination_status


class Awards(Base):
    __tablename__ = "awards"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    period_id: Mapped[UUID] = mapped_column(ForeignKey("fiscal_period.id", ondelete="RESTRICT"))
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    value_id: Mapped[UUID | None] = mapped_column(ForeignKey("emids_values.id"))
    prize_points: Mapped[int] = mapped_column(Integer)
    max_nominations_per_nominator: Mapped[int] = mapped_column(Integer)
    requires_jury: Mapped[bool] = mapped_column(Boolean, default=True)
    phase: Mapped[str] = mapped_column(cycle_phase, default="draft")
    nominations_end: Mapped[date | None] = mapped_column(Date)
    voting_end: Mapped[date | None] = mapped_column(Date)
    winner_nomination_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("awards_nominations.id"), unique=True,
    )
    winner_payout_points: Mapped[int | None] = mapped_column(Integer)
    decided_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime)
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
    shortlisted: Mapped[bool | None] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(nomination_status, default="submitted")
    flags: Mapped[list[str] | None] = mapped_column(JSONB)
    decided_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime)


class JuryAssignment(Base):
    __tablename__ = "jury_assignment"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    award_id: Mapped[UUID] = mapped_column(ForeignKey("awards.id", ondelete="CASCADE"))
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    granted_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    granted_at: Mapped[datetime] = mapped_column(DateTime)


class Ballot(Base):
    __tablename__ = "ballot"

    id: Mapped[UUID] = mapped_column(primary_key=True, server_default=text("gen_random_uuid()"))
    nomination_id: Mapped[UUID] = mapped_column(ForeignKey("awards_nominations.id", ondelete="CASCADE"))
    juror_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    score: Mapped[int] = mapped_column(SmallInteger)
    note: Mapped[str | None] = mapped_column(Text)
    voted_at: Mapped[datetime] = mapped_column(DateTime)
