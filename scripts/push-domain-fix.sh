#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true

git add -A
git commit -q -m "fix(recognitions): business errors mapped app-wide — no more 500s (review)

POST /recognitions (and the pending inbox route) previously let fn_* business
failures (insufficient_points, person_inactive, no_approval_route...) escape as
500s — the decide route had its own inline try/except, giving inconsistent and
duplicated mapping.

- RecognitionDomainError now has ONE app-level handler (main.py) translating
  fn codes to HTTP semantics: 409 conflicts, 422 validation, 404 not-found
- recognize/decide/pending stay thin DTO routes; the route-level try/except
  and `user` params (vestigial identity) are gone
- decision-path item ids are typed UUID end to end (route, service, DTO)
- structlog warning logs every mapped business error with actor + code
- tests/integration/test_recognition_errors.py pins the contract:
  over-allowance submit -> 409 with body {detail: insufficient_points}

Verified: pytest 9/9 on the live seeded DB; ruff + mypy strict clean on the
touched chain (app/api, app/main, services, logging)."
git log --oneline -3
git push origin feature/initial-backend 2>&1 | tail -2
docker rm -f recog-test-run >/dev/null 2>&1 || true
