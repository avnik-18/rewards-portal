#!/bin/bash
# Concurrency race suite — two live psql sessions racing the same row.
# Uses THIS repo's docs: DB built purely by alembic + docs seed.
#  R1  two parallel 200-pt submits from one 250 wallet → exactly one wins
#  R2  owner-decide + non-owner decide on the same item → exactly one effect
#
# Usage:
#   bash scripts/db-test-race.sh                    # auto-detects container
#   CONTAINER=x DB_NAME=y DB_USER=dba bash scripts/db-test-race.sh
#   RACE_DEBUG=1     # keep /tmp probe outputs after the run
set -u
DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$DIR"
DB_NAME=${DB_NAME:-recog}
DB_USER=${DB_USER:-postgres}
# RACE_DEBUG=1 keeps /tmp/r*.out probe dumps; CONFIRM_REBUILD is db-verify-only

# container: env override → compose db → any running postgres:15-alpine
CONTAINER=${CONTAINER:-$(docker ps --format '{{.Names}} {{.Image}}' \
  | grep 'postgres:15-alpine' | grep -E 'db|applause' | head -1 | cut -d' ' -f1)}
if [ -z "$CONTAINER" ]; then echo "no postgres container running"; exit 1; fi

run_sql() { docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"; }

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

echo "$sql1" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /tmp/r1a.$$.out 2>&1 &
echo "$sql2" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /tmp/r1b.$$.out 2>&1 &
wait

WINS=0
grep -qE "^\s+1 row|1 row" /tmp/r1a.$$.out && WINS=$((WINS+1))
grep -qE "1 row" /tmp/r1b.$$.out && WINS=$((WINS+1))
BAL=$(run_sql -Atqc "SELECT balance FROM to_recog_points WHERE user_id='$SAM'")
if [ "$WINS" = "1" ] && [ "$BAL" = "50" ]; then
  echo "R1_one_submit_wins PASS (one won; loser: $(grep -oE 'insufficient_points|to_recog_points_check' /tmp/r1a.$$.out /tmp/r1b.$$.out | head -1 | cut -d: -f2))"
else
  echo "R1_one_submit_wins FAIL (wins=$WINS balance=$BAL)"
  [ "${RACE_DEBUG:-0}" != "1" ] && rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out /tmp/r2a.$$.out /tmp/r2b.$$.out
  exit 1
fi
rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out

echo "--- R2: decide race on one item ---"
RREC=$(run_sql -Atqc "SELECT fn_submit_recognition('$RAHUL'::uuid, ARRAY['$PRIYA'::uuid], NULL, NULL, NULL, 'race item', 150, NULL, 'praise'::recognition_kind, NULL)")
ITEM=$(run_sql -Atqc "SELECT id FROM approval_item WHERE recognition_id='$RREC'")

(echo "SELECT fn_item_decide('$ITEM'::uuid, '$SAM'::uuid, true, NULL); COMMIT;" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /tmp/r2a.$$.out 2>&1) &
(echo "SELECT fn_item_decide('$ITEM'::uuid, '$LENA'::uuid, true, NULL); COMMIT;" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /tmp/r2b.$$.out 2>&1) &
wait
ST=$(run_sql -Atqc "SELECT status FROM approval_item WHERE id='$ITEM'")
grep -qE "not_pending_for_decider|item_already_" /tmp/r2b.$$.out \
  && echo "R2_one_decide_wins PASS (status=$ST)" \
  || { echo "R2_one_decide_wins FAIL (status=$ST)"; rm -f /tmp/r2a.$$.out /tmp/r2b.$$.out; exit 1; }
rm -f /tmp/r1a.$$.out /tmp/r1b.$$.out /tmp/r2a.$$.out /tmp/r2b.$$.out
