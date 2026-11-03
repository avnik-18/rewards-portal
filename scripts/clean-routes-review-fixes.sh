#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

p = pathlib.Path("app/repositories/applause_repository.py")
s = p.read_text(encoding="utf-8")

# 1. UoW per request: no commit in the repository. The idempotency conflict
#    path uses a SAVEPOINT (begin_nested) so the aborted retry attempt is
#    discarded while the request's transaction stays alive — the replay
#    lookup then reads it, and the session dependency commits once.
old = '''        try:
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
                await self._session.rollback()  # clear the aborted transaction
                original = await self._session.execute(
                    text("SELECT id FROM recognition_history WHERE idempotency_key = :key"),
                    dict(key=idempotency_key),
                )
                await self._session.commit()
                original_id = original.scalar()
                if original_id is None:
                    raise  # conflict without a row would contradict the key — surface it
                return (str(original_id), True)
            raise
        await self._session.commit()  # fn is atomic; nothing further can roll it back
        return (str(result.scalar()), False)'''
new = '''        try:
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
        return (str(result.scalar()), False)'''
s = s.replace(old, new)

# 2. decide_approval: drop the commit (dependency owns it)
old = '''        await self._session.commit()
        status = await self._session.execute(
            text("SELECT status::text FROM approval_item WHERE id = CAST(:item AS uuid)"),
            dict(item=item),
        )
        return str(status.scalar())'''
new = '''        status = await self._session.execute(
            text("SELECT status::text FROM approval_item WHERE id = CAST(:item AS uuid)"),
            dict(item=item),
        )
        return str(status.scalar())'''
s = s.replace(old, new)

# 3. recognition_replay: deterministic single row; missing row = integrity error
old = '''    async def recognition_replay(self, recognition_id: Any) -> tuple[str, int, Any]:
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
        return str(row["status"]), int(row["pending"]), row["id"]'''
new = '''    async def recognition_replay(self, recognition_id: Any) -> tuple[str, int, Any]:
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
        return str(row["status"]), int(row["pending"]), row["approval_item_id"]'''
s = s.replace(old, new)

# 4. inbox: document the delegation boundary (reviewer alternative 2)
old = '''    async def pending_approvals(self, referent: Any) -> AsyncIterator[dict[str, Any]]:
        """Approvals currently pending on a person's inbox — actioned or projected?"""'''
new = '''    async def pending_approvals(self, referent: Any) -> AsyncIterator[dict[str, Any]]:
        """Approvals currently pending on a person's inbox.

        DELEGATION OUT OF SCOPE for this PR (documented, tracked for the
        recognition_db workstream): the inbox and fn_item_decide match
        s.owner_id only — approval_delegation rows (delegator_id,
        delegate_id, valid_from/valid_to, scope) do NOT yet extend either.
        The future shape: owner_id = :referent OR EXISTS (open delegation
        delegator_id = :referent AND delegate lives in the inbox). The fn
        needs the same extension when it lands."""
        yield from ()  # replaced below — see the SELECT comment'''
# careful: keep the SELECT; only replace the docstring
old_doc = '''    async def pending_approvals(self, referent: Any) -> AsyncIterator[dict[str, Any]]:
        """Approvals currently pending on a person's inbox — actioned or projected?"""
        rows = await self._session.execute('''
new_doc = '''    async def pending_approvals(self, referent: Any) -> AsyncIterator[dict[str, Any]]:
        """Approvals currently pending on a person's inbox.

        DELEGATION OUT OF SCOPE for this PR (reviewer alternative): the inbox
        and fn_item_decide match s.owner_id only — approval_delegation rows
        (delegator_id, delegate_id, valid_from/valid_to, scope) do NOT yet
        extend either. Future shape: owner_id = :referent OR an open
        delegation from the referent (recognition_db revision).
        """
        rows = await self._session.execute('''
s = s.replace(old_doc, new_doc)

p.write_text(s, encoding="utf-8")
print("repo fixes applied")
EOF
echo ok
