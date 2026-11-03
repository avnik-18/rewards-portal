#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
git status --short | head -20
echo "== re-run the gates on the CURRENT tree before committing =="
docker compose up -d db >/dev/null 2>&1
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
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -3"
docker exec recog-test-run bash -c "cd /srv && ruff check app --output-format concise | tail -2 || true"
docker exec recog-test-run bash -c "cd /srv && mypy app 2>&1 | tail -2"

echo "== commit + push (branch: feature/initial-backend) =="
git add -A
git commit -q -m "feat(identity): fail-closed auth per reviewer comment + /me, /me/stats groundwork

- ENVIRONMENT must be set explicitly; production requires ENTRA_* — the app
  REFUSES to start without identity config (no silent X-Demo-User fallback in
  deployment: the reviewer's fail-open concern)
- Entra JWT verification implemented (not a 501 stub): tenant OIDC discovery
  + JWKS cached/refreshed, RS256 signature + iss/aud/exp/nbf/oid verified
- actor.py: the ONE identity dependency for all routes (reviewer ask) —
  resolved users.id via verified JWT subject (prod) or X-Demo-User (local);
  legacy get_current_user/CurrentUser dead code deleted
- /me returns full_name+role (banner), /me/stats returns balance/allowance/
  given/received for the Home tiles; role resolved from role_assignment (RBAC
  groundwork, provisional mapping: individual|admin|hr)
- models/schema mirrors typed (dict[str, Any]), health endpoint environment
  guarded, pyjwt[crypto] added as a runtime dependency
- dashboard-identity branch content landed here (delta verified empty)

Gates: pytest 14/14 · pylint naming 10.00/10 · ruff clean · mypy strict clean (app)"
git log --oneline -3
git push origin feature/initial-backend 2>&1 | tail -2
docker rm -f recog-test-run >/dev/null 2>&1 || true
echo "== done =="
