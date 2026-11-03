#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# 1. missing business codes into the mapping sets (reviewer table)
p = pathlib.Path("app/api/v1/recognitions.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    'CONFLICT = {"insufficient_points", "person_inactive", "double_refund_blocked",\n'
    '            "self_recognition_blocked"}',
    'CONFLICT = {"insufficient_points", "person_inactive", "double_refund_blocked",\n'
    '            "self_recognition_blocked", "points_out_of_range"}')
s = s.replace(
    'NOT_FOUND = {"recipient_not_found", "item_not_found", "person_not_found", "prize_pool_empty"}'
    if 'NOT_FOUND = {"recipient_not_found' in s
    else 'NOT_FOUND = {"prize_pool_empty"}',
    'NOT_FOUND = {"recipient_not_found", "item_not_found", "person_not_found", "prize_pool_empty"}')
p.write_text(s, encoding="utf-8")
print("mapping sets updated")

# 2. give the runner image the docker CLI (integration fixtures use it)
p = pathlib.Path("scripts/contract-test.sh")
s = p.read_text(encoding="utf-8")
s = s.replace(
    "RUN pip install -q 'sqlalchemy[asyncio]'",
    "RUN apt-get update -qq && apt-get install -qq -y -q docker.io >/dev/null\nRUN pip install -q 'sqlalchemy[asyncio]'")
p.write_text(s, encoding="utf-8")
print("runner gains docker CLI")
EOF

echo "== rerun gates =="
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-test-run >/dev/null 2>&1 || true
docker rmi -f recog-test-runner:latest >/dev/null 2>&1 || true
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
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -6"
docker exec recog-test-run bash -c "cd /srv && mypy app 2>&1 | tail -3"
