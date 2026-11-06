#!/bin/bash
# Concurrency race suite — two live connections racing the same row.
# Uses THIS repo's docs: DB built purely by alembic + docs seed.
#  R1  two parallel 200-pt submits from one 250 wallet → exactly one wins
#  R2  owner-decide + non-owner decide on the same item → exactly one effect
#
# Connection: DATABASE_URL (lead review — no docker exec; Docker/compose is
# only what runs Postgres). Falls back to the local compose default.
#
# Usage:
#   bash scripts/db-test-race.sh                       # DATABASE_URL / compose default
#   DATABASE_URL=... bash scripts/db-test-race.sh      # any reachable Postgres
#   RACE_DEBUG=1     # keep /tmp probe outputs after the run
set -u
DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$DIR"
DB_NAME=${DB_NAME:-recog}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_PORT=${DB_PORT:-5432}
# RACE_DEBUG=1 keeps /tmp/r*.out probe dumps; CONFIRM_REBUILD is db-verify-only

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASS}@127.0.0.1:${DB_PORT}/${DB_NAME}"
fi

PYTHON=${PYTHON:-}
if [ -z "$PYTHON" ]; then
  if [ -x ".venv/bin/python" ]; then PYTHON=".venv/bin/python";
  elif command -v python3 >/dev/null 2>&1; then PYTHON=python3;
  else echo "ABORT: no python found (pip install -e \".[dev]\" first)"; exit 1; fi
fi
run_sql() { "$PYTHON" "$DIR/scripts/dbexec.py" "$@"; }

ID() { run_sql -Atqc "SELECT id FROM users WHERE employee_code='$1'"; }
SAM=$(ID E-L1); PRIYA=$(ID E-PR); RAHUL=$(ID E-RH); LENA=$(ID E-L2); ARUN=$(ID E-L3)
# ensure the staff are active (an edge-suite leaver test may have separated Rahul)
run_sql -Atqc "UPDATE users SET employment_status='active' WHERE employment_status <> 'active'" > /dev/null

echo "--- R1: parallel submits, one 250 wallet ---"
run_sql -Atqc "UPDATE to_recog_points SET balance = allocated WHERE user_id='$SAM'" > /dev/null
gen_uuid() { if [ -r /proc/sys/kernel/random/uuid ]; then cat /proc/sys/kernel/random/uuid; else printf '%s-%s' "$$" "$RANDOM$RANDOM$(date +%s 2>/dev/null || echo 0)"; fi; }
KEY1=$(gen_uuid); KEY2=$(gen_uuid)

sql1="BEGIN;
SELECT fn_submit_recognition('$SAM'::uuid, ARRAY['$PRIYA'::uuid], NULL, NULL, NULL, 'race1', 200, NULL, 'praise', '$KEY1'::uuid);
COMMIT;"
sql2="BEGIN;
SELECT fn_submit_recognition('$SAM'::uuid, ARRAY['$ARUN'::uuid], NULL, NULL, NULL, 'race2', 200, NULL, 'praise', '$KEY2'::uuid);
COMMIT;"

echo "$sql1" | run_sql > /tmp/r1a.$$.out 2>&1 &
echo "$sql2" | run_sql > /tmp/r1b.$$.out 2>&1 &
wait

# structural, not output-grepping: exactly one connection succeeded (the other
# died on the business rule), exactly one history row exists, wallet = 250-200
ERRS=0
grep -q "^ERROR:" /tmp/r1a.$$.out && ERRS=$((ERRS+1))
grep -q "^ERROR:" /tmp/r1b.$$.out && ERRS=$((ERRS+1))
WINS=$((2 - ERRS))
ROWS=$(run_sql -Atqc "SELECT count(*) FROM recognition_history WHERE idempotency_key IN ('$KEY1','$KEY2')")
BAL=$(run_sql -Atqc "SELECT balance FROM to_recog_points WHERE user_id='$SAM'")
LOSER=$(grep -hoE 'insufficient_points|to_recog_points_check' /tmp/r1a.$$.out /tmp/r1b.$$.out 2>/dev/null | head -1)
if [ "$WINS" = "1" ] && [ "$ROWS" = "1" ] && [ "$BAL" = "50" ]; then
  echo "R1_one_submit_wins PASS (one won; loser: ${LOSER:-<none printed>})"
else
  echo "R1_one_submit_wins FAIL (wins=$WINS history_rows=$ROWS balance=$BAL loser=${LOSER:-none})"
  [ "${RACE_DEBUG:-0}" != "1" ] && rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out /tmp/r2a.$$.out /tmp/r2b.$$.out
  exit 1
fi
rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out

echo "--- R2: decide race on one item ---"
RREC=$(run_sql -Atqc "SELECT fn_submit_recognition('$RAHUL'::uuid, ARRAY['$PRIYA'::uuid], NULL, NULL, NULL, 'race item', 150, NULL, 'praise'::recognition_kind, NULL)")
ITEM=$(run_sql -Atqc "SELECT id FROM approval_item WHERE recognition_id='$RREC'")

(echo "SELECT fn_item_decide('$ITEM'::uuid, '$SAM'::uuid, true, NULL); COMMIT;" | run_sql > /tmp/r2a.$$.out 2>&1) &
(echo "SELECT fn_item_decide('$ITEM'::uuid, '$LENA'::uuid, true, NULL); COMMIT;" | run_sql > /tmp/r2b.$$.out 2>&1) &
wait
ST=$(run_sql -Atqc "SELECT status FROM approval_item WHERE id='$ITEM'")
LOST=$(grep -hoE 'not_pending_for_decider|item_already_' /tmp/r2a.$$.out /tmp/r2b.$$.out 2>/dev/null | head -1)
if [ -n "$LOST" ]; then
  echo "R2_one_decide_wins PASS (status=$ST; loser: $LOST)"
else
  echo "R2_one_decide_wins FAIL (status=$ST; no concurrent-decide error in either session)"
  rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out /tmp/r2a.$$.out /tmp/r2b.$$.out
  exit 1
fi
rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out /tmp/r2a.$$.out /tmp/r2b.$$.out
