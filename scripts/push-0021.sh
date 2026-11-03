#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true

git add -A
git commit -q -m "feat(db+api): fn_* raise with USING ERRCODE (C549xx); API maps on sqlstate

DB side (alembic/versions/0019_fn_errcodes.py — recognition workstream):
- recreates fn_submit_recognition, fn_approve_recognition,
  fn_decline_recognition, fn_admin_set_budget, fn_allowance_seed,
  fn_deactivate_person with USING ERRCODE = 'C549xx' on every business
  RAISE (C54901 insufficient_points .. C54921 person_not_found)
- primary messages unchanged; downgrade reconstructs 0013/0015/0017
  bodies verbatim
- C54917 not_pending_for_decider (403), C54905 item_already_* (409),
  C54916 approver_unresolvable[_at_step] (404)

API side:
- service _error_code maps e.orig.sqlstate via _SQLSTATE_TO_CODE —
  the message-prefix bridge becomes a fallback for pre-0019 databases
  (deleted once staging/prod have 0019 applied)
- handler _code_status: 403 for not_pending_for_decider, 409 family,
  404 prefix family, closing 500 for unmapped codes
- repository: dead DB_ERRORS dict removed; DBAPIError propagates raw to the
  service (single translation pipeline: repo raises → service maps →
  handler renders)

Remaining pre-existing ruff debt (models/schema Optional style, email.py
long lines, etc.) is tracked separately and out of this PR's scope."
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
