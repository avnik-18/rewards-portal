#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib
p = pathlib.Path("app/repositories/applause_repository.py")
s = p.read_text(encoding="utf-8")
s = s.replace('''class ValidationError(Exception):
    """Wraps fn_* SQL errors — services translate it into HTTPException."""
''', "")
p.write_text(s, encoding="utf-8")
print("dead ValidationError class removed")
EOF

docker rm -f recog-test-run >/dev/null 2>&1 || true
docker compose up -d db >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

cat > /tmp/Dockerfile.runner <<'EOF'
FROM python:3.12-slim
RUN pip install -q 'sqlalchemy[asyncio]' asyncpg pydantic-settings structlog fastapi 'uvicorn[standard]' httpx pytest pytest-asyncio pytest-cov
EOF
docker build -q -t recog-quick-runner -f /tmp/Dockerfile.runner /tmp >/dev/null
docker run -d --name recog-test-run --network host -v "$PWD:/srv" -w /srv \
  -e ENVIRONMENT=local \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 \
  recog-quick-runner sleep 600 >/dev/null
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -3"
docker rm -f recog-test-run >/dev/null 2>&1 || true

git add -A
git commit -q -m "chore: remove dead ValidationError class (repo no longer wraps DBAPIError)"
git push origin feature/initial-backend 2>&1 | tail -2
