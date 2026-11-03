#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true
git add -A
git commit -q -m "fix(repository): transaction/unit-of-work + projection + delegation scope (review)

1) Transaction ownership (reviewer): commit/rollback once per request —
   the session dependency commits on success and rolls back + re-raises on
   any failure; repositories never commit. The idempotent-retry conflict
   now discards only the failed attempt via a SAVEPOINT (begin_nested), so
   the request transaction stays alive across the replay lookup; future
   writes (outbox/audit/notification) land in the same unit of work.
2) recognition_replay (reviewer): a missing projection row right after
   fn_submit raises (internal fault, surfaced as 500) instead of
   inventing a 'cancelled' status; the projection is deterministic
   (pending-first, then newest) instead of GROUP BY + .first() picking
   arbitrarily; regression test added.
3) Delegation (reviewer alternative): documented OUT OF SCOPE for this PR —
   the inbox and fn_item_decide match s.owner_id only; approval_delegation
   (delegator_id/delegate_id/validity/scope) is NOT honoured yet, tracked
   for the recognition_db workstream with the planned extension shape in
   the repository docstring."
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
