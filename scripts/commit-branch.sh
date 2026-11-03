#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true

git switch feature/dashboard-identity-stats
git add -A
git commit -m "feat(dashboard): /me profile + /me/stats, shared actor dependency, loop-safe engine

- GET /me: full identity (id, employee_code, full_name, email, role) — powers the
  'Hello {name}' banner; role resolved from role_assignment (RBAC groundwork,
  provisional mapping: admin / hr / individual)
- GET /me/stats: points_balance, allowance {left}/{allocated}, recognitions
  given/received — the Home 'My activity' tiles
- app/core/actor.py: shared get_actor_id dependency; recognitions.py drops its
  private copy and vestigial user params (identity NEVER from the body)
- app/db/session.py: engine re-created when the owning asyncio loop changes —
  fixes 'Event loop is closed' when several DB-touching test files run together
- tests: integration flow for identity + stats deltas (auto-band 25 pts moves
  given/received/balance/allowance exactly); unit test updated for header guard
- tooling: tests/** bandit import rules added to ruff per-file-ignores

Verified: pytest 8/8 on the live seeded DB; ruff + mypy strict clean on the
touched files."
git log --oneline -3
git push -u origin feature/dashboard-identity-stats 2>&1 | tail -2
