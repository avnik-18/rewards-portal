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
- FN functions raise with `USING ERRCODE = '<sqlstate>'` (e.g. C54901 =
  insufficient_points) carrying the business code in the PG DETAIL/HINT.
- That SQLSTATE is the ONLY intended mapping key (e.orig.sqlstate) — the
  fallback parsing below dies with that migration.
Until the ERRCODE migration lands the durable bridge for `RAISE EXCEPTION`
(sqlstate P0001, the PL/pgSQL default) is the message prefix; it reads the
pg error object directly (never a SQLAlchemy render), dialect-agnostic:
psycopg2 exposes it on `.diag.message_primary`, asyncpg on `.message`.
"""

from typing import Any
from uuid import UUID

from sqlalchemy.exc import DBAPIError

from app.repositories.applause_repository import ApplauseRepository


class RecognitionDomainError(Exception):
    """Carries the fn_* error code so handlers can map to HTTP semantics."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


def _pg_message(orig: Any) -> str:
    """Primary message of the wrapped pg error, dialect-agnostic.

    psycopg2: `.diag.message_primary`. asyncpg: no diag object and no
    `.message` — the postgres-authored text is the exception's own string."""
    diag = getattr(orig, "diag", None)
    if diag is not None:
        return str(getattr(diag, "message_primary", None) or "")
    direct = getattr(orig, "message", None)
    if direct:
        return str(direct)
    return str(orig)


def _error_code(exc: DBAPIError) -> str:
    """Derive the machine-stable business code from a fn_ failure.

    1. e.orig.sqlstate — the intended key once FNs raise WITH a custom
       ERRCODE (see the DB contract block in the module docstring).
    2. Transitional bridge for pre-ERRCODE raises (sqlstate P0001, the
       PL/pgSQL default): the business code is the first word of the
       primary message ("insufficient_points: ..."). Deletes when the
       recognition_db workstream lands its ERRCODE migration. This parses
       the DB-authored message, never a SQLAlchemy render.
    Anything unrecognised returns the empty string → the caller maps to 500."""
    orig = exc.orig
    sqlstate = str(getattr(orig, "sqlstate", None) or "P0001")
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

    async def submit_recognition(
        self, actor_id: UUID, to_user_ids: list[UUID], cc_user_ids: list[UUID],
        value_id: UUID | None, message: str, points: int,
    ) -> UUID:
        rid = await self._repo.submit_recognition(
            actor_id, to_user_ids, cc_user_ids, value_id, message, points
        )
        return UUID(str(rid))

    async def _translating(self, awaitable: Any) -> Any:
        """Wraps a DB call: DBAPIError → RecognitionDomainError with the
        stable code + the pg primary message as the detail."""
        try:
            return await awaitable
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e

    async def recognize(
        self,
        actor_id: UUID,
        to_user_ids: list[UUID],
        cc_user_ids: list[UUID],
        value_id: UUID | None,
        points: int,
        message: str,
    ) -> tuple[UUID, str, int, UUID | None]:
        """Returns (recognition_id, status, pending_step_count, approval_item_id|None).

        actor_id is the RESOLVED caller (never body-supplied — see the router's
        get_actor_id dependency)."""
        if points != 0 and actor_id in to_user_ids:
            raise RecognitionDomainError(
                "self_recognition_blocked", "the giver cannot also be a recipient"
            )
        try:
            rid = await self.submit_recognition(
                actor_id, to_user_ids, cc_user_ids, value_id, message, points
            )
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e

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
            raise RecognitionDomainError(
                "decline_note_required", "declining requires a note"
            )
        try:
            return await self._repo.decide_approval(item_id, approver_id, approve, note)
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e

    async def pending_for(self, approver_id: UUID) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        async for row in self._repo.pending_approvals(approver_id):
            rows.append(row)
        return rows
