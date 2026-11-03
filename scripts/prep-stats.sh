#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

echo "== current branch =="
git switch feature/initial-backend >/dev/null 2>&1
git branch --show-current
echo "== create stacked branch =="
git switch -c feature/dashboard-identity-stats 2>&1 || git switch feature/dashboard-identity-stats

echo "== role_assignment columns =="
docker compose up -d >/dev/null 2>&1
docker rm -f recog-info >/dev/null 2>&1 || true
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
docker exec recog-api-db-1 psql -U postgres -d recog -c "\d role_assignment" | head -20
echo "== app_role enum =="
docker exec recog-api-db-1 psql -U postgres -d recog -t -c "SELECT enum_range(NULL::app_role);"
docker exec recog-api-db-1 psql -U postgres -d recog -t -c "SELECT u.employee_code, u.full_name, r.role FROM role_assignment r JOIN users u ON u.id=r.user_id ORDER BY u.employee_code;"
echo "== recognition_history full columns =="
docker exec recog-api-db-1 psql -U postgres -d recog -c "\d recognition_history" | sed -n '3,20p'
