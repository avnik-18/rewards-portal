"""Repository for the Applause recognition database.

The schema is DB-OWNED (alembic/versions/*.py) and its business rules live in
SQL functions — repositories call those functions through plain SQL, they do
not hand-write money math. See db/README.md in this repo for the fn surface
and db/schema.sql for the DDL.

Function surface used here (see db/README.md §4):
  fn_submit_recognition(from, to[], cc[], value, tpl, msg, pts, art, kind, idemkey)
  fn_item_decide(item, decider, approve, note)
  fn_admin_set_budget(user, period, allocated, actor)
  fn_deactivate_person(user, actor, reason)
  fn_allowance_seed(period)
"""

from collections.abc import AsyncIterator
from typing import Any

import sqlalchemy.exc
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

DB_ERRORS = {
    "insufficient_points": "not enough quarterly allowance for this recognition",
    "person_inactive": "the giver or a recipient is not active",
    "guest_cannot_receive": "external guests cannot receive points",
    "self_recognition_blocked": "the giver cannot also be a recipient",
    "no_approval_route": "no approval rule matched these points",
    "no_allowance_for_period": "no allowance row for the current period — run fn_allowance_seed",
    "allocation_below_spent": "cannot lower the allowance below points already spent",
    "item_already_pending": "this approval was already decided",
    "item_already_approved": "this approval was already decided",
    "item_already_declined": "this approval was already decided",
    "item_already_returned": "this approval was already decided",
    "item_already_cancelled": "this approval was already decided",
    "not_pending_for_decider": "this step is not currently awaiting this approver",
    "double_refund_blocked": "this recognition was already refunded once",
    "decline_note_required": "declining requires a note",
    "approver_unresolvable": "no approver could be resolved for a step",
    "recipient_total_mismatch": "per-recipient points do not sum to the total",
    "accounts_missing": "it system — ledger accounts missing for a wallet",
    "prize_pool_empty": "the prize pool has no funds for this award",
    "journal_not_balanced": "internal data integrity error",
}


class ApplauseRepository:
    """Applause repo pattern methods: SQL only, no HTTP/HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def submit_recognition(
        self,
        from_user: Any,
        to_users: list[Any],
        cc_users: list[Any] | None,
        value_id: Any,
        message: str,
        points: int,
    ) -> str:
        """Call fn_submit_recognition; on success returns the recognition id."""
        try:
            result = await self._session.execute(
                text(
                    "SELECT fn_submit_recognition("
                    ":from_user, :to_users, :cc_users, :value_id, NULL, "
                    ":message, :points, NULL, 'praise'::recognition_kind, "
                    "NULL) AS id"
                ),
                dict(
                    from_user=from_user,
                    to_users=to_users,
                    cc_users=cc_users,
                    value_id=value_id,
                    message=message,
                    points=points,
                ),
            )
        except sqlalchemy.exc.DBAPIError as e:
            raise ValidationError(str(e.orig)) from e
        await self._session.commit()  # fn is atomic; nothing further can roll it back
        return str(result.scalar())

    async def user_id_by_code(self, employee_code: str) -> Any:
        """Resolve an employee_code to a users.id (the dev-mode X-Demo-User path)."""
        result = await self._session.execute(
            text("SELECT id FROM users WHERE employee_code = :code"),
            dict(code=employee_code),
        )
        return result.scalar()

    async def recognition_replay(self, recognition_id: Any) -> tuple[str, int, Any]:
        """(status, pending_step_count, approval_item_id) after submit."""
        result = await self._session.execute(
            text(
                "SELECT rh.status::text, COALESCE(count(s.id) FILTER "
                "(WHERE s.status = 'pending'), 0) AS pending, ai.id "
                "FROM recognition_history rh "
                "LEFT JOIN approval_item ai ON ai.recognition_id = rh.id "
                "LEFT JOIN approval_item_step s ON s.approval_item_id = ai.id "
                "WHERE rh.id = :rid GROUP BY rh.status, ai.id"
            ),
            dict(rid=recognition_id),
        )
        row = result.mappings().first()
        if row is None:
            return "cancelled", 0, None
        return str(row["status"]), int(row["pending"]), row["id"]

    async def decide_approval(
        self,
        item: Any,
        decider: Any,
        approve: bool,
        note: str | None,
    ) -> str:
        """Call fn_item_decide; returns the post-decision approval_item.status."""
        try:
            result = await self._session.execute(
                text("SELECT fn_item_decide(CAST(:item AS uuid), CAST(:decider AS uuid), :approve, :note)"),
                dict(item=item, decider=decider, approve=approve, note=note),
            )
        except sqlalchemy.exc.DBAPIError as e:
            raise ValidationError(str(e.orig)) from e
        await self._session.commit()
        status = await self._session.execute(
            text("SELECT status::text FROM approval_item WHERE id = CAST(:item AS uuid)"),
            dict(item=item),
        )
        return str(status.scalar())

    async def person_dashboard(self, person: Any) -> dict[str, Any]:
        """Everything the person dashboard needs, from the DB surface.

        Note: balances are derived NOT stored — the wallet balances cached by
        triggers must be read directly here; ledger history comes from the
        ledger table itself (SELECT FROM ledger WHERE user_id=:person).
        """
        result = await self._session.execute(
            text(
                "SELECT u.id, u.employee_code, u.full_name, u.title, u.department, "
                "u.joined_on, u.employment_status::text, m.full_name AS manager_name "
                "FROM users u LEFT JOIN users m ON m.id = u.manager_id "
                "WHERE u.id = :person"
            ),
            dict(person=person),
        )
        row = result.mappings().first()
        if row is None:
            return {}
        return dict(row)

    async def pending_approvals(self, referent: Any) -> AsyncIterator[dict[str, Any]]:
        """Approvals currently pending on a person's inbox, shaped exactly as
        the PendingApprovalRow DTO expects (alias ai.id -> approval_item_id;
        snapshot.base_points may be absent for items whose approval snapshot
        carries no pricing — COALESCE to 0 so the DTO's non-optional points
        field can never blow up on a NULL cast)."""
        rows = await self._session.execute(
            text(
                "SELECT ai.id AS approval_item_id, ai.kind::text, s.seq, s.level::text AS level, "
                "s.mode::text, s.owner_id, sub.full_name AS submitter_name, "
                "COALESCE((ai.snapshot->>'base_points')::int, 0) AS points, s.note "
                "FROM approval_item_step s JOIN approval_item ai ON ai.id = s.approval_item_id "
                "JOIN users sub ON sub.id = ai.submitter_id "
                "WHERE s.owner_id = :referent AND s.status = 'pending' AND ai.status = 'pending' "
                "ORDER BY ai.created_at"
            ),
            dict(referent=referent),
        )
        for row in rows.mappings():
            yield dict(row)


class ValidationError(Exception):
    """Wrapping fn_* SQL errors — services translate it into HTTPException."""
