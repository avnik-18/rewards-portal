#!/usr/bin/env bash
# Bring up the CURRENT branch code on :8000 with your seeded dev DB, and leave it running
# for Swagger/Postman inspection. The regular compose api container is stopped while live
# (port conflict) — `docker compose up -d` after cleanup restores it.
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

docker compose stop api >/dev/null 2>&1 || docker stop recog-api-api-1 >/dev/null 2>&1 || true
docker rm -f recog-test-run recog-preview >/dev/null 2>&1 || true
docker rmi -f recog-test-runner:latest >/dev/null 2>&1 || true
docker compose up -d db >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

cat > /tmp/Dockerfile.runner <<'EOF'
FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -qq -y -q docker.io curl >/dev/null
RUN pip install -q 'sqlalchemy[asyncio]' alembic asyncpg psycopg2-binary pydantic-settings structlog fastapi 'uvicorn[standard]' opentelemetry-sdk opentelemetry-instrumentation-fastapi httpx pytest pytest-asyncio pytest-cov ruff mypy
EOF
docker build -q -t recog-test-runner -f /tmp/Dockerfile.runner /tmp >/dev/null

docker run -d --name recog-preview --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 \
  recog-test-runner sleep 3600 >/dev/null
docker exec -d recog-preview bash -c "cd /srv && uvicorn app.main:app --host 0.0.0.0 --port 8000"
for i in {1..20}; do curl -fsS http://localhost:8000/healthz >/dev/null 2>&1 && break; sleep 1; done

echo "== instance up — quick curls (what you'll see in Swagger/Postman) =="
echo "-- no header (identity guard) --"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/v1/me
echo "-- X-Demo-User: E-PR -> /me --"
curl -s http://localhost:8000/api/v1/me -H "X-Demo-User: E-PR"; echo
echo "-- X-Demo-User: E-PR -> /me/stats --"
curl -s http://localhost:8000/api/v1/me/stats -H "X-Demo-User: E-PR"; echo
echo "-- X-Demo-User: E-L1 (seeded admin) -> /me --"
curl -s http://localhost:8000/api/v1/me -H "X-Demo-User: E-L1"; echo
echo "-- recognitions inbox for E-L1 --"
curl -s "http://localhost:8000/api/v1/recognitions/approvals" -H "X-Demo-User: E-L1" | head -c 400; echo
echo
echo "== running: uvicorn on :8000 (container recog-preview). Swagger: http://localhost:8000/docs =="
