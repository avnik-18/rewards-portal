#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-ch >/dev/null 2>&1 || true
docker compose up -d db >/dev/null 2>&1
for i in {1..20}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

cat > /tmp/DFcheck2 <<'PYEOF'
FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -qq -y -q docker.io >/dev/null
RUN pip install -q 'sqlalchemy[asyncio]' asyncpg pydantic-settings structlog fastapi 'uvicorn[standard]' httpx pytest pytest-asyncio pytest-cov ruff mypy pylint pyjwt[crypto] cryptography alembic
PYEOF
docker build -q -t recogcheck:latest -f /tmp/DFcheck2 /tmp >/dev/null

docker run -d --name recog-ch --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 recogcheck:latest sleep 600 >/dev/null

echo "== ruff --fix + format app/models =="
docker exec recog-ch bash -c "cd /srv && ruff check --fix app/models/ && ruff format app/models/ 2>&1 | tail -4"
echo "== ruff (models after format) == "
docker exec recog-ch bash -c "cd /srv && ruff check app/models --output-format concise" | head -6
echo "== pytest =="
docker exec recog-ch bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -3"
echo "== mypy (app) =="
docker exec recog-ch bash -c "cd /srv && mypy app 2>&1 | tail -3"
docker exec recog-ch bash -c "cd /srv && python -c 'from app.models import Users; print(Users.__tablename__)'"
docker rm -f recog-ch >/dev/null
