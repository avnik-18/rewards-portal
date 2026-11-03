#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true

git add -A
git commit -q -m "fix(recognitions): dito error-mapping hardening per review (diagnosis from lead)

The reviewer nailed three things about my previous pass:

1. msg-parsing dependence on SQLAlchemy string shape → replaced by
   e.orig.sqlstate from the pg error object; the fallback parses the
   DB-authored message text directly (dialect-agnostic helper reading
   .diag on psycopg2 and the exception string on asyncpg — no SQLAlchemy
   layer str(e) ever enters the parser), deletes the moment the DB team's
   ERRCODE migration lands
2. missing family codes → item_already_* (409 prefix), approver_unresolvable
   + approver_unresolvable_at_step_N (404 prefix)
3. wrong 404 on the caller-not-an-approver case → not_pending_for_decider is
   403 now; anything unmapped (check constraint, connection issue...) ends
   in the closing 500 branch — never a fake 404
4. dead DB_ERRORS dict deleted; repository no longer wraps DBAPIError into
   ValidationError (one translation pipeline: repo raises raw, service maps,
   handler renders)
5. sqlalchemy pinned major (2.0.x) + uv.lock committed

Tests: unit mapping-table contract (403/409/404/500 branches + families)
+ integration 409 for over-allowance + inbox-shaped; 19/19 green on the
live seeded DB; ruff + mypy strict clean on touched chain."
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
