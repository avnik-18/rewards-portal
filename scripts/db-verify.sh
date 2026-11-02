#!/bin/bash
# Applause DB verification gate — runs ONLY against a database built by this
# repo's Alembic chain (alembic upgrade head) + this repo's optional demo seed.
# 22/22 core + 20/20 edge + 2/2 race.
#
# Order: alembic upgrade head → self-heal check → purge → seed → suites → races → purge.
#   bash scripts/db-verify.sh               # DB_NAME=recog; container auto-detected
#   DB_NAME=x bash scripts/db-verify.sh
#   AUTO_SEED=0                             # no seed step (suites fail empty)
set -u
DIR=$(cd "$(dirname "$0")/.." && pwd)   # repo root
DESIGN="$DIR/docs/db/design-source"
DB_NAME=${DB_NAME:-recog}
# compose db container creds default: postgres/postgres on host port 5432
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_PORT=${DB_PORT:-5432}

# container: env override → compose `db` → any running postgres:15-alpine
CONTAINER=${CONTAINER:-$(docker ps --format '{{.Names}} {{.Image}}' \
  | grep 'postgres:15-alpine' | grep -E 'db|applause' | head -1 | cut -d' ' -f1)}
if [ -z "$CONTAINER" ]; then echo "no postgres container running"; exit 1; fi
echo "container: $CONTAINER  db: $DB_NAME"
run_sql() { docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"; }

ALEMBIC=${ALEMBIC:-}
if [ -z "$ALEMBIC" ]; then
  if [ -x ".venv/bin/alembic" ]; then ALEMBIC=".venv/bin/alembic";
  elif command -v alembic >/dev/null 2>&1; then ALEMBIC=alembic;
  else echo "ABORT: alembic not found (pip install -e \".[dev]\" first)"; exit 1; fi
fi
export DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@127.0.0.1:${DB_PORT}/${DB_NAME}"

echo "--- alembic upgrade head ---"
"$ALEMBIC" upgrade head 2>&1 | tail -1

# self-heal: a stamped-but-incomplete schema (alembic_version says head but the
# Applause tables are absent) reports "relation does not exist" later and makes
# results differ per environment. Detect and rebuild cleanly instead.
TABLE_COUNT=$(run_sql -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
if [ "$TABLE_COUNT" -lt 30 ]; then
  echo "WARNING: schema incomplete ($TABLE_COUNT tables) despite alembic claiming head — rebuild."
  run_sql -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  "$ALEMBIC" upgrade head 2>&1 | tail -1
fi

echo "--- fresh state: purge + seed ---"
run_sql -v ON_ERROR_STOP=1 < "$DESIGN/purge-demo.sql" > /dev/null
run_sql -v ON_ERROR_STOP=1 < "$DESIGN/demo-seed.sql" | tail -2

echo "--- verify-core.sql ---"
run_sql < "$DESIGN/verify-core.sql" 2>&1 | grep -c PASS
run_sql < "$DESIGN/verify-core.sql" 2>&1 | grep FAIL || echo no_failures

echo "--- verify-edges.sql ---"
run_sql < "$DESIGN/verify-edges.sql" > /dev/null
run_sql -Atqc "SELECT count(*) FILTER (WHERE NOT ok) AS fails, count(*) AS checks FROM verify2"

echo "--- db-test-race.sh (concurrency) ---"
bash "$DIR/scripts/db-test-race.sh"

echo "--- final state ---"
run_sql -Atqc "SELECT 'users='||(SELECT count(*) FROM users)||' journal_drift='||(
  SELECT count(*) FROM (SELECT journal_id FROM journal_line GROUP BY journal_id
  HAVING SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END)<>0) x)||' wallet_drift='||(
  SELECT count(*) FROM vw_wallet_reconcile WHERE drift<>0)"
run_sql -v ON_ERROR_STOP=1 < "$DESIGN/purge-demo.sql" > /dev/null
echo "purged to empty."
