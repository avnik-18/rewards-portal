"""Recognition business rules — thin above ApplauseRepository.

The money math, routing, ledger and approval-chain rules live IN THE DATABASE
(fn_submit_recognition / fn_item_decide, see docs/db/design-source/README.md).
This service only:
- adapts repository results to DTOs
- translates DB errors → domain exceptions with stable codes, mapped by the
  app-wide handler (app/api/v1/recognitions.py) to HTTP semantics
- checks the giver/recipient distinctness and points sanity once here for a
  friendly message even before the DB raises (never silently clamp)

Error-code contract with the recognition_db workstream:
- FN functions raise with `USING ERRCODE = '<sqlstate>'` (e.g. C5491 =
  insufficient_points) carrying the business code in the PG DETAIL/HINT.
  Custom SQLSTATEs are five characters (the PG limit) — see the table in
  alembic/versions/0019_fn_errcodes.py, the contract's source of truth.
- That SQLSTATE is the ONLY intended mapping key (e.orig.sqlstate) — the
  fallback parsing below dies with that migration.
Until the ERRCODE migration lands the durable bridge for `RAISE EXCEPTION`
(sqlstate P0001, the PL/pgSQL default) is the message prefix; it reads the
pg error object directly (never a SQLAlchemy render), dialect-agnostic:
psycopg2 exposes it on `.diag.message_primary`, asyncpg on `.message`.
"""

from typing import Any
from uuid import UUID

import structlog
from sqlalchemy.exc import DBAPIError

from app.repositories.applause_repository import ApplauseRepository

log = structlog.get_logger(__name__)


class RecognitionDomainError(Exception):
    """Carries the fn_* error code so handlers can map to HTTP semantics."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


def _pg_message(orig: Any) -> str:
    """Primary message of the pg error, dialect-agnostic.

    psycopg2: `.diag.message_primary`. The asyncpg dialect exposes only
    SQLAlchemy's adapter wrapper, whose own args carry the rendered
    "<class ...>: message" string — the postgres-authored text lives on
    the original asyncpg exception in the cause chain (plain `RaiseError`):
    prefer `.message` / first arg of chain members over any render."""
    chain: list[Any] = [getattr(orig, "__cause__", None), getattr(orig, "__context__", None), orig]
    for err in chain:
        if err is None:
            continue
        diag = getattr(err, "diag", None)
        if diag is not None:
            return str(getattr(diag, "message_primary", None) or "")
        direct = getattr(err, "message", None)
        if direct:
            return str(direct)
        args = getattr(err, "args", None)
        if args and not str(args[0]).startswith("<class '"):
            return str(args[0])
    return str(orig)


# Keys are the five-char SQLSTATEs the fn_* bodies raise with
# `USING ERRCODE = '...'` (PG limit: five chars). Contract table /
# source of truth: alembic/versions/0019_fn_errcodes.py.
# Keys ending in '_' are DYNAMIC raises whose full business code is the
# first word of the primary message ('item_already_%' carries the status):
# _error_code completes them from the message.
_SQLSTATE_TO_CODE = {
    "C5491": "insufficient_points",
    "C5492": "person_inactive",
    "C5493": "double_refund_blocked",
    "C5494": "self_recognition_blocked",
    "C5495": "item_already_",
    "C5496": "points_out_of_range",
    "C549A": "recipient_not_found",
    "C549B": "guest_cannot_receive",
    "C549C": "recipient_total_mismatch",
    "C549D": "no_allowance_for_period",
    "C549E": "allocation_below_spent",
    "C549F": "no_approval_route",
    "C549G": "approver_unresolvable_at_step",
    "C549H": "not_pending_for_decider",
    "C549K": "prize_pool_empty",
    "C549L": "decline_note_required",
    "C549M": "item_not_found",
    "C549N": "person_not_found",
    "C549P": "self_admin_blocked",
    "C549Q": "insufficient_privilege",
    "C549R": "account_not_found",
    "C549S": "hold_journal_missing",
    "C549T": "hold_lines_missing",
    "C549U": "no_budget_policy",
    "C5497": "value_not_found",
    "C5498": "template_not_found",
    "C5499": "template_value_mismatch",
}


def _error_code(exc: DBAPIError) -> str:
    """Derive the machine-stable business code from a fn_ failure.

    1. e.orig.sqlstate — the sole mapping key: every FN raises WITH a custom
       ERRCODE (0019_fn_errcodes) and the mapping above resolves the code.
       Dynamic raises ('item_already_%') are completed from the message's
       first word, falling back to the marker prefix if that ever fails.
    2. Transitional bridge for pre-ERRCODE databases (existing dev/staging
       environments where the head state predates 0019): the business code is
       the first word of the primary message ("insufficient_points: ...").
       Deletes when all deployed environments have 0019 applied.
    Anything unrecognised returns the empty string → the caller maps to 500."""
    orig = exc.orig
    sqlstate = str(getattr(orig, "sqlstate", None) or "P0001")
    if sqlstate in _SQLSTATE_TO_CODE:
        code = _SQLSTATE_TO_CODE[sqlstate]
        if code.endswith("_"):
            first = _pg_message(orig).split(":", 1)[0].strip()
            if first.startswith(code) and first.isidentifier():
                return first
        return code
    if sqlstate != "P0001":
        return sqlstate
    message = _pg_message(orig)
    first = message.split(":", 1)[0].strip()
    if not first:
        return ""
    return first if all(part.isidentifier() for part in first.split("_")) else ""


class RecognitionService:
    def __init__(self, repo: ApplauseRepository) -> None:
        self._repo = repo

    async def recognition_count(self) -> int:
        """Org-wide total — straight adapter over the read, no error
        translation possible (recognition_history reads cannot raise
        business codes)."""
        return await self._repo.recognition_count()

    async def submit_recognition(
        self,
        actor_id: UUID,
        to_user_ids: list[UUID],
        cc_user_ids: list[UUID],
        value_id: UUID | None,
        template_id: UUID | None,
        art_url: str | None,
        message: str,
        points: int,
        idempotency_key: UUID | None = None,
    ) -> tuple[UUID, bool]:
        """Returns (recognition_id, replayed). replayed=True when an idempotent
        retry resolved to the ORIGINAL recognition (the retry never double-
        spends — the repository owns the conflict/rollback)."""
        rid, replayed = await self._repo.submit_recognition(
            actor_id,
            to_user_ids,
            cc_user_ids,
            value_id,
            template_id,
            art_url,
            message,
            points,
            idempotency_key,
        )
        return UUID(rid), replayed

    async def recognize(
        self,
        actor_id: UUID,
        to_user_ids: list[UUID],
        cc_user_ids: list[UUID],
        value_id: UUID | None,
        template_id: UUID | None,
        art_url: str | None,
        points: int,
        message: str,
        idempotency_key: UUID | None = None,
    ) -> tuple[UUID, str, int, UUID | None]:
        """Returns (recognition_id, status, pending_step_count, approval_item_id|None).

        actor_id is the RESOLVED caller (never body-supplied — see the router's
        get_actor_id dependency). idempotency_key dedupes client retries:
        the replay branch returns the original recognition."""
        if actor_id in to_user_ids:
            # mirrors fn_submit_recognition unconditionally — even a
            # zero-point self-recognition is blocked by the fn, so the
            # pre-check must not widen that (reviewer: adapter parity)
            raise RecognitionDomainError("self_recognition_blocked", "the giver cannot also be a recipient")
        try:
            rid, replayed = await self.submit_recognition(
                actor_id,
                to_user_ids,
                cc_user_ids,
                value_id,
                template_id,
                art_url,
                message,
                points,
                idempotency_key,
            )
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e
        if replayed:
            log.info("recognition.replayed_by_key", actor_id=str(actor_id), recognition_id=str(rid))

        # status + routing depth: pending means the chain is frozen and waiting;
        # routed_to = how many steps await; item id matches the pending approval
        status, routed, item = await self._repo.recognition_replay(rid)
        return rid, status, routed, item

    async def decide(
        self,
        item_id: UUID,
        approver_id: UUID,
        approve: bool,
        note: str | None,
    ) -> str:
        """approver_id is the RESOLVED caller (never body-supplied)."""
        if not approve and not (note and note.strip()):
            raise RecognitionDomainError("decline_note_required", "declining requires a note")
        try:
            return await self._repo.decide_approval(item_id, approver_id, approve, note)
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e

    async def pending_for(self, approver_id: UUID) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        async for row in self._repo.pending_approvals(approver_id):
            rows.append(row)
        return rows
