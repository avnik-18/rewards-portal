#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-polish >/dev/null 2>&1 || true
for i in {1..20}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
docker run -d --name recog-polish --network host -v "$PWD:/srv" -w /srv recog-test-runner sleep 300 >/dev/null
docker exec recog-polish bash -c "cd /srv && ruff check --fix tests/unit/test_recognition_mapping.py && ruff check app/core/actor.py tests/unit/test_recognition_mapping.py --output-format concise"
docker rm -f recog-polish >/dev/null
