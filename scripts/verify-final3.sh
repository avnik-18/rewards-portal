#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-final3 >/dev/null 2>&1 || true
for i in {1..20}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
docker run -d --name recog-final3 --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 recog-test-runner sleep 600 >/dev/null
echo "== pytest (all) =="
docker exec recog-final3 bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -4"
echo "== mypy (app) =="
docker exec recog-final3 bash -c "cd /srv && mypy app 2>&1 | tail -4"
docker rm -f recog-final3 >/dev/null 2>&1 || true
