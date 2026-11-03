#!/usr/bin/env bash
# One command to verify the whole rewards-portal-api scaffold, end to end.
#
#   wsl --cd <repo-root> -- bash scripts/verify.sh
#   (plain: bash scripts/verify.sh  — from the repo root or anywhere)
#
# Checks: containers up · /healthz · /api/v1/health · demo route · /me identity ·
#         Postgres answers · full unit-test suite (in an ephemeral container).
# Exits non-zero if any check fails.
set -uo pipefail

cd "$(dirname "$0")/.."

pass=0
fail=0

ok()   { printf '  PASS  %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  FAIL  %s\n' "$1"; fail=$((fail+1)); }

curl_contains() { # url, needle
  local url="$1" needle="$2" body
  body=$(curl -fsS --max-time 10 "$url" 2>/dev/null) || return 1
  [[ "$body" == *"$needle"* ]]
}

echo "== rewards-portal-api verification =="

echo "[1/6] containers"
if docker compose up -d >/dev/null 2>&1; then
  for _ in {1..30}; do
    st=$(docker compose ps --status running -q 2>/dev/null | wc -l)
    [[ "$st" -ge 2 ]] && break
    sleep 1
  done
  n=$(docker compose ps --status running -q 2>/dev/null | wc -l)
  if [[ "$n" -ge 2 ]]; then ok "2 containers running (api + db)"; else bad "only $n container(s) running"; fi
else
  bad "docker compose up failed"
fi

# uvicorn needs a few seconds to listen after the container starts (cold start,
# image rebuild) — wait for it once before probing, so the HTTP checks don't
# fail spuriously against a mid-startup API.
echo "[2/6] healthz"
for _ in {1..30}; do
  curl_contains http://localhost:8000/healthz '"status":"ok"' && break
  sleep 1
done
curl_contains http://localhost:8000/healthz '"status":"ok"' && ok "/healthz ok" || bad "/healthz"

echo "[3/6] versioned health"
curl_contains http://localhost:8000/api/v1/health '"status":"ok"' && ok "/api/v1/health ok" || bad "/api/v1/health"

echo "[4/6] walking skeleton (router->service)"
curl_contains http://localhost:8000/api/v1/demo/Priya 'Hello, Priya!' && ok "demo route ok" || bad "demo route"

echo "[5/6] identity dependency"
curl_contains http://localhost:8000/api/v1/me '"id":"anonymous"' && ok "/me dev-identity ok" || bad "/me"

echo "[6/6] database answers"
if docker compose exec -T db pg_isready -U postgres -d recog >/dev/null 2>&1; then
  ok "postgres accepting connections"
else
  bad "postgres not accepting connections"
fi

echo "== unit tests (ephemeral container, ~1-2 min) =="
if docker run --rm -v "$PWD:/srv" -w /srv python:3.12-slim \
     bash /srv/scripts/test-in-docker.sh 2>&1 | tail -3; then
  if docker run --rm -v "$PWD:/srv" -w /srv python:3.12-slim \
       bash /srv/scripts/test-in-docker.sh 2>/dev/null | grep -q "passed"; then
    ok "pytest suite green"
  else
    bad "pytest suite red"
  fi
fi

echo "== summary: $pass passed, $fail failed =="
[[ "$fail" -eq 0 ]] || exit 1
