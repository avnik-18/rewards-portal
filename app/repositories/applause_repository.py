"""Repository for the Applause recognition database.

The schema is DB-OWNED (alembic/versions/*.py) and its business rules live in
SQL functions — repositories call those functions through plain SQL, they do
not hand-write money math. See docs/db/design-source/README.md for the fn surface
and schema.sql for the DDL.

Function surface used here (see docs/db/design-source/README.md §4):
  fn_submit_recognition(from, to[], cc[], value, tpl, msg, pts, art, kind, idemkey)
  fn_item_decide(item, decider, approve, note)
  fn_admin_set_budget(user, period, allocated, actor)
  fn_deactivate_person(user, actor, reason)
  fn_allowance_seed(period)
"""

from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession


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
        idempotency_key: Any = None,
    ) -> Any:
        """Call fn_submit_recognition; on success returns the recognition id.

        DB failures propagate as raised (DBAPIError) — the service layer
        translates them to domain errors with the stable business code (see
        recognition_service._error_code). Except: a unique violation on the
        idempotency key (a client retry behind the driver's 23505) is
        resolved HERE — the aborted transaction is rolled back and the
        ORIGINAL recognition id is returned — returns (id, replayed).
        """
        try:
            # savepoint so an idempotent-retry unique conflict discards ONLY
            # the failed attempt; the request transaction stays alive and is
            # committed once by the session dependency (reviewer: UoW per
            # request, no commits in repositories)
            async with self._session.begin_nested():
                result = await self._session.execute(
                    text(
                        "SELECT fn_submit_recognition("
                        ":from_user, :to_users, :cc_users, :value_id, NULL, "
                        ":message, :points, NULL, 'praise'::recognition_kind, "
                        ":idempotency_key) AS id"
                    ),
                    dict(
                        from_user=from_user,
                        to_users=to_users,
                        cc_users=cc_users,
                        value_id=value_id,
                        message=message,
                        points=points,
                        idempotency_key=idempotency_key,
                    ),
                )
        except DBAPIError as e:
            if (str(getattr(e.orig, "sqlstate", None) or "") == "23505"
                    and idempotency_key is not None):
                original_id = (
                    await self._session.execute(
                        text("SELECT id FROM recognition_history "
                             "WHERE idempotency_key = :key"),
                        dict(key=idempotency_key),
                    )
                ).scalar()
                if original_id is None:
                    raise  # conflict without a row would contradict the key
                return (str(original_id), True)
            raise
        return (str(result.scalar()), False)

    async def recognition_count(self) -> int:
        """Org-wide total of APPROVED recognitions only.

        Accepted recognitions are what the Home tile displays — pending,
        declined, returned and cancelled rows never happened from the
        reader's point of view (deploy-decision: approved-only semantics).
        No user scope; a cached counter is the documented production
        follow-up (PROD-DEPLOYMENT.md on the db-workstream branch)."""
        result = await self._session.execute(
            text("SELECT count(*) FROM recognition_history "
                 "WHERE status = 'approved'")
        )
        return int(result.scalar_one())

    async def user_id_by_code(self, employee_code: str) -> Any:
        """Resolve an employee_code to a users.id (the dev-mode X-Demo-User path)."""
        result = await self._session.execute(
            text("SELECT id FROM users WHERE employee_code = :code"),
            dict(code=employee_code),
        )
        return result.scalar()

    async def user_id_by_external_id(self, external_id: str) -> Any:
        """Map a verified SSO subject (Entra oid) to a users.id. Portal access
        requires the row to exist with external_id populated (HRIS sync)."""
        result = await self._session.execute(
            text("SELECT id FROM users WHERE external_id = :external_id"),
            dict(external_id=external_id),
        )
        return result.scalar()

    async def recognition_replay(self, recognition_id: Any) -> tuple[str, int, Any]:
        """(status, pending_step_count, approval_item_id) after submit.

        A missing row right after a successful insert is an integrity fault:
        it raises instead of inventing a 'cancelled' status (reviewer). The
        projection is deterministic even if a recognition ever gains more
        than one approval item: the pending item first, then the newest."""
        result = await self._session.execute(
            text(
                "SELECT rh.status::text AS status, "
                "COALESCE(count(s.id) FILTER (WHERE s.status = 'pending'), 0) "
                "AS pending, ai.id AS approval_item_id "
                "FROM recognition_history rh "
                "LEFT JOIN approval_item ai ON ai.recognition_id = rh.id "
                "LEFT JOIN approval_item_step s ON s.approval_item_id = ai.id "
                "WHERE rh.id = :rid "
                "GROUP BY rh.status, ai.id, ai.created_at "
                "ORDER BY (bool_or(s.status = 'pending')) DESC NULLS LAST, "
                "ai.created_at DESC NULLS LAST LIMIT 1"
            ),
            dict(rid=recognition_id),
        )
        row = result.mappings().first()
        if row is None:
            raise RuntimeError(
                "recognition_history row missing immediately after fn_submit — "
                "internal projection fault (must surface as 500, not a status)"
            )
        return str(row["status"]), int(row["pending"]), row["approval_item_id"]

    async def decide_approval(
        self,
        item: Any,
        decider: Any,
        approve: bool,
        note: str | None,
    ) -> str:
        """Call fn_item_decide; returns the post-decision approval_item.status.

        DB failures propagate as raised (DBAPIError) — service translates."""
        await self._session.execute(
            text(
                "SELECT fn_item_decide("
                "CAST(:item AS uuid), CAST(:decider AS uuid), :approve, :note)"
            ),
            dict(item=item, decider=decider, approve=approve, note=note),
        )
        status = await self._session.execute(
            text("SELECT status::text FROM approval_item WHERE id = CAST(:item AS uuid)"),
            dict(item=item),
        )
        return str(status.scalar())

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
