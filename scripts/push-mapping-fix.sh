#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-final3 >/dev/null 2>&1 || true
git add -A
git commit -q -m "fix(recognitions): points_out_of_range maps 422 (of the 4 flagged codes); renamed validator public; sqlstate contract test (review)

- _code_status moved points_out_of_range from CONFLICT to UNPROCESSABLE (422)
  — the reviewer's four flagged codes (points_out_of_range, recipient_not_found,
  item_not_found, person_not_found) now map: 422 / 404 / 404 / 404
- contract test added: every value of _SQLSTATE_TO_CODE asserts a non-500
  HTTP status so the sqlstate table and the route mapping cannot drift
- jwt validator made public (validate_entra_jwt — reviewer nit: private
  imported cross-module); actor + tests renamed
- actor.py bearer/auth lines narrowed to satisfy mypy + ruff (session
  narrowed after the identity guard)"
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
