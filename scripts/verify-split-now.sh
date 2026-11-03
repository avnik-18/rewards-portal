#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

cat > /tmp/DFrunner <<'PYEOF'
FROM python:3.12-slim
RUN pip install -q 'sqlalchemy[asyncio]' asyncpg pydantic-settings structlog fastapi 'uvicorn[standard]' httpx pytest pytest-asyncio pytest-cov ruff mypy pylint pyjwt[crypto] cryptography
PYEOF
docker build -q -t recogr:latest -f /tmp/DFrunner /tmp >/dev/null
docker run -d --name recog-verify --network host -v "$PWD:/srv" -w /srv recogr:latest sleep 600 >/dev/null

echo "== import all models =="
docker exec recog-verify python -c "from app.models import Users; print('OK', Users.__tablename__)"

echo "== pytest (all) =="
docker exec recog-verify bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -5"

echo "== ruff (app/models) =="
docker exec recog-verify bash -c "cd /srv && ruff check app/models --output-format concise" | head -6

echo "== mypy (app) =="
docker exec recog-verify bash -c "cd /srv && mypy app 2>&1 | tail -6"

echo "== naming gate =="
docker exec recog-verify bash -c "cd /srv && pylint --disable=all --enable=invalid-name app 2>&1 | grep -E 'rated' | head -2"

docker rm -f recog-verify >/dev/null 2>&1
