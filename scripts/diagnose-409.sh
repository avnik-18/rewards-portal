#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
source .venv/bin/activate
export ENVIRONMENT=local
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog
export PG_CONTAINER=recog-api-db-1
python -m pytest tests/integration/test_recognition_errors.py --no-cov --tb=short -q --no-header 2>&1 | tail -16
