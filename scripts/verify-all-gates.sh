#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-verify-ci >/dev/null 2>&1 || true

cat > /tmp/DFgate <<'PYEOF'
FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -qq -y -q docker.io >/dev/null
RUN pip install -q 'sqlalchemy[asyncio]' alembic asyncpg psycopg2-binary pydantic-settings structlog fastapi 'uvicorn[standard]' opentelemetry-sdk opentelemetry-instrumentation-fastapi httpx pytest pytest-asyncio pytest-cov ruff mypy pylint pyjwt[crypto] cryptography bandit
PYEOF
docker build -q -t recog-gate-runner -f /tmp/DFgate /tmp >/dev/null

docker run -d --name recog-verify-ci --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 recog-gate-runner sleep 900 >/dev/null

echo "== ruff (app + tests) =="
docker exec recog-verify-ci bash -c "cd /srv && ruff check app tests --output-format concise" | head -4
echo "== mypy strict (app) =="
docker exec recog-verify-ci bash -c "cd /srv && mypy app 2>&1 | tail -3"
echo "== bandit (app) =="
docker exec recog-verify-ci bash -c "cd /srv && bandit -r app --format brief 2>&1 | tail -4"
echo "== pytest (all, live DB) =="
docker exec recog-verify-ci bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -4"
echo "== naming gate == "
docker exec recog-verify-ci bash -c "cd /srv && pylint --disable=all --enable=invalid-name app 2>&1 | grep -oE '\d+(\.\d+)?/10' 2>/dev/null | head -1 || echo done"

docker rm -f recog-verify-ci >/dev/null 2>&1
