#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-test-run >/dev/null 2>&1 || true
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

cat > /tmp/Dockerfile.runner <<'EOF'
FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -qq -y -q docker.io >/dev/null
RUN pip install -q 'sqlalchemy[asyncio]' alembic asyncpg psycopg2-binary pydantic-settings structlog fastapi 'uvicorn[standard]' opentelemetry-sdk opentelemetry-instrumentation-fastapi httpx pytest pytest-asyncio pytest-cov ruff mypy pylint pyjwt[crypto] cryptography
EOF
docker build -q -t recog-test-runner -f /tmp/Dockerfile.runner /tmp >/dev/null

docker run -d --name recog-test-run --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 \
  recog-test-runner sleep 900 >/dev/null

echo "== ruff fix touched files =="
docker exec recog-test-run bash -c "cd /srv && ruff check --fix tests/integration/test_recognition_idempotency.py >/dev/null 2>&1 || true"
echo "== pytest (all) =="
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -5"
echo "== ruff (touched) =="
docker exec recog-test-run bash -c "cd /srv && ruff check app/api/v1/recognitions.py app/services/recognition_service.py app/repositories/applause_repository.py tests/integration/test_recognition_idempotency.py --output-format concise" | head -10
echo "== mypy (touched) =="
docker exec recog-test-run bash -c "cd /srv && mypy app/api/v1/recognitions.py app/services/recognition_service.py app/repositories/applause_repository.py 2>&1 | tail -4"
