#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true
git add -A
git commit -q -m "docs+chore: ADR 0001 — business logic in PL/pgSQL; dead stubs removed (review)

- docs/adr/0001-business-logic-in-pl-pgsql.md records the decided design
  (routing/chain/ledger in DB fns; services = thin adapters) AND its
  accepted costs exactly as the review asked: fn bodies redefined across
  migrations (noisy diffs) and logic testing requiring a live DB, with
  the mitigations (focused revisions, db-verify gate, scratch-DB
  integration playbook)
- deletes the scaffolding-era stubs that described the opposite design:
  approval_service.py, wallet_service.py, reports_service.py
- CLAUDE.md rewritten: 'logic in the service layer'/scaffold/stub-map
  wording replaced with the ADR reference + thin-adapter consequences;
  transactions section added (session-owned UoW per the other review)
- stale db/README.md pointers fixed in app docstrings + README (the file
  never existed; the fn surface reference now points at
  docs/db/design-source/README.md)

Verified: pytest 21/21 on the live seeded DB; pylint naming 10.00/10;
ruff untouched; mypy strict clean (33 files post-deletion)."
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
