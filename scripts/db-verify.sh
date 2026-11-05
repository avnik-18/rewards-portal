#!/bin/bash
# Applause DB verification gate — runs ONLY against a database built by this
# repo's Alembic chain (alembic upgrade head) + this repo's optional demo seed.
# 22/22 core + 25/25 edge + 2/2 race.
#
# Order: alembic upgrade head → self-heal check → purge → seed → suites → races → purge.
#   bash scripts/db-verify.sh               # DB_NAME=recog; container auto-detected
#   DB_NAME=x bash scripts/db-verify.sh
#   AUTO_SEED=0                             # no seed step (suites fail empty)
#   CONFIRM_REBUILD=yes                     # allow the self-heal DROP SCHEMA/CASCADE
set -u -o pipefail
DIR=$(cd "$(dirname "$0")/.." && pwd)   # repo root
cd "$DIR"                               # alembic + file paths are repo-relative
DESIGN="$DIR/docs/db/design-source"
DB_NAME=${DB_NAME:-recog}
# compose db container creds default: postgres/postgres on host port 5432
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_PORT=${DB_PORT:-5432}
# psql -d re-parses the db name as a conninfo string; reject metacharacters by
# allowing only a conservative charset ([A-Za-z0-9_.@-])
for _v in "$DB_NAME" "$DB_USER" "$DB_PASS"; do
  if [ -n "${_v//[A-Za-z0-9_.@-]/}" ]; then
    echo "ABORT: DB creds/name contain psql/conninfo metacharacters"; exit 1
  fi
done

# container: env override → compose `db` → any running postgres:15-alpine.
# Always print what was picked — a wrong autodetect means the purge below
# runs against the wrong instance, so override CONTAINER on shared machines.
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
# revision docstrings carry typographic dashes; a POSIX-C locale would make
# Python refuse to print them — pin UTF-8 mode for the alembic calls
export PYTHONUTF8=1

echo "--- alembic upgrade head ---"
"$ALEMBIC" upgrade head 2>&1 | tail -8 || { echo "ABORT: alembic upgrade head failed"; exit 1; }

# self-heal: a stamped-but-incomplete schema (alembic_version says head but the
# Applause tables are absent) reports "relation does not exist" later and makes
# results differ per environment. Detect and rebuild cleanly instead.
# Full head schema ≈ 40 public entries (35 base tables + alembic_version
# + 4 views); a stamped-but-broken rebuild leaves far fewer.
TABLE_COUNT=$(run_sql -Atqc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
case "$TABLE_COUNT" in ''|*[!0-9]*) echo "ABORT: could not count public tables"; exit 1;; esac
if [ "$TABLE_COUNT" -lt 35 ]; then
  if [ "${CONFIRM_REBUILD:-}" != "yes" ]; then
    echo "ABORT: public schema looks incomplete ($TABLE_COUNT entries) on '$CONTAINER/$DB_NAME'."
    echo "A rebuild DROPS EVERYTHING in it — re-run with CONFIRM_REBUILD=yes if that is intended."
    exit 1
  fi
  echo "WARNING: schema incomplete ($TABLE_COUNT tables) despite alembic claiming head — rebuild."
  run_sql -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  "$ALEMBIC" upgrade head 2>&1 | tail -8 || { echo "ABORT: rebuild upgrade failed"; exit 1; }
  # DROP SCHEMA CASCADE also drops the api role's grants: re-apply them so a
  # compose-managed database is not quietly neutered after a self-heal.
  if [ -f "$DIR/docker/init-app-role.sql" ]; then
    echo "--- re-applying app-role grants after rebuild ---"
    run_sql -v ON_ERROR_STOP=1 < "$DIR/docker/init-app-role.sql" >/dev/null 2>&1 || echo "WARN: app-role re-grant failed"
  fi
fi

echo "--- fresh state: purge + seed ---"
run_sql -v ON_ERROR_STOP=1 < "$DESIGN/purge-demo.sql" > /dev/null \
  || { echo "ABORT: purge failed"; exit 1; }
if [ "${AUTO_SEED:-1}" != "0" ]; then
  run_sql -v ON_ERROR_STOP=1 < "$DESIGN/demo-seed.sql" | tail -2 \
    || { echo "ABORT: demo seed failed"; exit 1; }
fi
# register the failure trap BEFORE any data lands: a killed gate leaves the
# scratch db empty (final purge + trap purge are idempotent with each other)
trap 'run_sql -v ON_ERROR_STOP=1 < "$DESIGN/purge-demo.sql" > /dev/null 2>&1 || true' EXIT

echo "--- verify-core.sql ---"
# the PASS count is a GATE, not a display: fewer than 22 means a suite
# section died silently (handler re-raise or a psql-level error)
CORE_OUT=$(run_sql -v ON_ERROR_STOP=1 < "$DESIGN/verify-core.sql" 2>&1) \
  || { echo "verify-core.sql DIED:"; echo "$CORE_OUT" | tail -5; exit 1; }
CORE_PASS=$(echo "$CORE_OUT" | grep -c PASS || true)
CORE_FAIL=$(echo "$CORE_OUT" | grep FAIL || echo no_failures)
echo "core PASS=$CORE_PASS/22  $CORE_FAIL"
[ "$CORE_PASS" -eq 22 ] || { echo "FAIL: verify-core had $CORE_PASS/22 checks"; exit 1; }
echo "$CORE_FAIL" | grep -q '^no_failures$' || { echo "FAIL: verify-core reported failures"; echo "$CORE_FAIL"; exit 1; }

echo "--- verify-edges.sql ---"
run_sql -v ON_ERROR_STOP=1 < "$DESIGN/verify-edges.sql" > /dev/null \
  || { echo "verify-edges.sql DIED"; exit 1; }
EDGES=$(run_sql -Atqc "SELECT count(*) FILTER (WHERE NOT ok), count(*) FROM verify2")
echo "edges fails|checks = $EDGES (need 0|25)"
[ "$EDGES" = "0|25" ] || { echo "FAIL: verify-edges reported $EDGES"; exit 1; }

echo "--- db-test-race.sh (concurrency) ---"
bash "$DIR/scripts/db-test-race.sh" || { echo "FAIL: race suite"; exit 1; }

echo "--- final state ---"
run_sql -Atqc "SELECT 'users='||(SELECT count(*) FROM users)||' journal_drift='||(
  SELECT count(*) FROM (SELECT journal_id FROM journal_line GROUP BY journal_id
  HAVING SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END)<>0) x)||' wallet_drift='||(
  SELECT count(*) FROM vw_wallet_reconcile WHERE drift<>0)"
run_sql -v ON_ERROR_STOP=1 < "$DESIGN/purge-demo.sql" > /dev/null
echo "purged to empty."
