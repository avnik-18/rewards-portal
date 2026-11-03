#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-test-run >/dev/null 2>&1 || true
for i in {1..20}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
docker run -d --name recog-test-run --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 recog-test-runner sleep 600 >/dev/null
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/unit/test_recognition_mapping.py --no-cov --tb=short -q --no-header 2>&1" | grep -B2 -A8 "test_review_flagged" | head -20
docker rm -f recog-test-run >/dev/null 2>&1 || true
