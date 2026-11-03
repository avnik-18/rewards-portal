#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-test-run >/dev/null 2>&1 || true
git add -A
git commit -q -m "fix(recognitions): idempotency wired — POST /recognitions accepts Idempotency-Key (review)

The fn surface already takes p_idempotency_key and recognition_history has the
UNIQUE column, but the route passed NULL forever — a client retry (mobile
double-tap / network replay) created a SECOND recognition and spent the
giver's points twice.

- POST /recognitions accepts an optional Idempotency-Key header (UUID),
  threaded route → service → repository → fn_submit_recognition
- the unique violation is resolved in the REPOSITORY (it owns the session):
  the aborted transaction is rolled back, the ORIGINAL recognition is
  selected, and the service returns it with the same shape as a first
  submit (recognition_id/status replayed via recognition_replay)
  — a retry can never double-spend
- reproduces the reviewer's spec: on the conflict, return the original
  recognition; retries WITHOUT a key still create separate recognitions
  (no key = no dedupe promise)
- integration test: same-key retry replays the original id with zero
  additional spend; keyless submit still creates a distinct recognition
  (delta-asserted on given/received/balance)
"
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
