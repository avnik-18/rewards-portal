#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-vbandit >/dev/null 2>&1 || true
cat > /tmp/DFverify <<'ABCEOF'
FROM python:3.12-slim
RUN pip install -q 'sqlalchemy[asyncio]' asyncpg pydantic-settings structlog fastapi 'uvicorn[standard]' httpx pytest pytest-asyncio pytest-cov ruff mypy pyjwt[crypto] bandit
ABCEOF
docker build -q -t recogverify -f /tmp/DFverify /tmp >/dev/null
docker run -d --name recog-vbandit --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 recogverify sleep 600 >/dev/null

echo "== bandit (clean?) =="
docker exec recog-vbandit bandit -r app -f txt 2>&1 | grep -E "Issue|No issues" | head -4

echo "== ruff (app+tests) =="
docker exec recog-vbandit ruff check app tests --output-format concise 2>&1 | head -4

echo "== pytest (all, incl. email test) =="
docker exec recog-vbandit bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1" | tail -4

echo "== mypy (app) =="
docker exec recog-vbandit mypy app 2>&1 | tail -3

docker rm -f recog-vbandit >/dev/null 2>&1
