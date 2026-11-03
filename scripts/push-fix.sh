#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

echo "== bring DB back up (WSL idle stop) =="
docker compose up -d >/dev/null 2>&1 || docker compose up -d db >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

echo "== sanity rename leftovers (want only container names + domain terms) =="
leftovers=$(git grep -n "recog-api" -- . | grep -v "recog-api-db-1" | grep -v "recog-api-api" | grep -v "recognition" || true)
[ -z "$leftovers" ] && echo "none ✅" || { echo "$leftovers"; exit 1; }

echo "== pytest sanity (full suite, live seeded DB) =="
docker rm -f recog-test-run >/dev/null 2>&1 || true
docker rmi -f recog-test-runner:latest >/dev/null 2>&1 || true
cat > /tmp/Dockerfile.runner <<'EOF'
FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -qq -y -q docker.io >/dev/null
RUN pip install -q 'sqlalchemy[asyncio]' alembic asyncpg psycopg2-binary pydantic-settings structlog fastapi 'uvicorn[standard]' opentelemetry-sdk opentelemetry-instrumentation-fastapi httpx pytest pytest-asyncio pytest-cov
EOF
docker build -q -t recog-test-runner -f /tmp/Dockerfile.runner /tmp >/dev/null
docker run -d --name recog-test-run --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 \
  recog-test-runner sleep 900 >/dev/null
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -3"

echo "== commit the cleanup, push =="
git add -A
git commit -q -m "chore: repo naming cleanup (review) — scratch scripts removed, canonical repo name

- deletes every operator one-off script that snuck in via add -A (audit-/,
  commit-branch, diagnose-db, fix-*, preview, runner, setup-dev etc) — repo
  scripts hygiene is now the CLAUDE.md policy item
- renames recog-api -> rewards-portal-api across pyproject, compose, app
  config default name, package.json, alembic versions README, verify.sh
- docker-compose: explicit container_name for db (recog-api-db-1) + api —
  keeps tests/e2e defaults stable for anyone cloning the org repo
- drops the (formerly recog-api) provenance note on reviewer request:
  canonical repo name everywhere, no stale aliases"
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2

docker rm -f recog-test-run >/dev/null 2>&1 || true
echo "== done =="
