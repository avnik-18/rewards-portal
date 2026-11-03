#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true
git add -A
git commit -q -m "fix(recognitions): pending-inbox route no longer 500s on rows (review)

GET /recognitions/approvals crashed whenever the inbox had rows and never had
a test:
- repository selects ai.id AS approval_item_id — the dict now carries the
  key the PendingApprovalRow DTO requires (KeyError on every populated inbox)
- snapshot.base_points may be absent for non-pricing approvals — COALESCE to
  0 keeps the DTO's non-optional points field valid on NULL snapshots
- reviewer regression test added: routed recognition -> pending item -> the
  pending owner's inbox returns 200 with rows shaped exactly like the DTO
  (owner resolved from the DB, not demo-org guessed)"

git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
