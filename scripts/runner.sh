#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "[runner] db only (dev uvicorn owns :8000)"
docker compose up -d db >/dev/null
docker rm -f recog-test-run >/dev/null 2>&1 || true
docker rmi -f recog-test-runner:latest >/dev/null 2>&1 || true
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

echo "== pytest (all) =="
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -5"
echo "== naming gate =="
docker exec recog-test-run bash -c "cd /srv && pylint --disable=all --enable=invalid-name app 2>&1 | grep -E 'C0103|rated' | head -8"
echo "== ruff (touched set) =="
docker exec recog-test-run bash -c "cd /srv && ruff check app/api/v1/me.py app/api/v1/recognitions.py app/core/actor.py app/core/security.py app/core/config.py app/core/logging.py app/main.py app/db/session.py app/repositories/applause_repository.py app/repositories/me_repository.py app/services/me_service.py app/services/recognition_service.py app/schemas/me.py tests/integration/test_identity_stats.py tests/integration/test_recognition_errors.py tests/unit/test_identity_gate_and_jwt.py tests/unit/test_walking_skeleton.py --output-format concise" | head -12
echo "== mypy (app, per repo mandate) =="
docker exec recog-test-run bash -c "cd /srv && mypy app 2>&1 | tail -8"
