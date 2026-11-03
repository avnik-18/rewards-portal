#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== containers before =="
docker compose ps -a | tail -3
echo "== bring DB up =="
docker compose up -d db >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
echo "== pg_isready inside container =="
docker exec recog-api-db-1 pg_isready -U postgres -d recog
echo "== port publish =="
docker port recog-api-db-1
echo "== probe from WSL host (what uvicorn does) =="
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/127.0.0.1/5432' && echo "127.0.0.1:5432 reachable" || echo "127.0.0.1:5432 NOT reachable"
echo "== data still there? =="
docker exec recog-api-db-1 psql -U postgres -d recog -t -c "SELECT 'users='||count(*) FROM users;"
echo "== quick SQL sanity via the same URL style the app uses =="
docker exec recog-api-db-1 psql -U postgres -d recog -t -c "SELECT 'db responds: ' || 'ok';"
