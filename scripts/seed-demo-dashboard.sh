#!/usr/bin/env bash
# Final dashboard-numbers verification.
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

docker exec -i recog-api-db-1 psql -U postgres -d recog -v ON_ERROR_STOP=1 <<'SQL'
-- second jury seat for E-PR (so their ballot story reads "1 of 2 cast")
INSERT INTO jury_assignment (award_id, user_id, granted_by)
SELECT a.id, u.id, (SELECT id FROM users WHERE employee_code='E-L3')
FROM awards a, users u
WHERE a.name = 'Customer Champion' AND u.employee_code='E-PR'
AND NOT EXISTS (SELECT 1 FROM jury_assignment j WHERE j.award_id = a.id AND j.user_id = u.id);
SQL

docker exec -i recog-api-db-1 psql -U postgres -d recog -t -A <<'SQL'
SELECT '=== FINAL DASHBOARD NUMBERS (E-PR view) ===';
SELECT '-- leaderboard: peer points received this quarter (top 5) --';
SELECT rn || '. ' || name || ' (' || code || ') = ' || pts || ' pts' FROM (
  SELECT row_number() OVER (ORDER BY s.pts DESC) rn, u.full_name name, u.employee_code code, s.pts
  FROM (SELECT user_id, SUM(amount) pts FROM ledger GROUP BY user_id) s
  JOIN users u ON u.id = s.user_id) AS t
LIMIT 5;
SELECT '-- showcase --';
SELECT 'days_to_nominations_close = ' || (SELECT MIN(nominations_end) - CURRENT_DATE FROM awards);
SELECT 'awards_in_cycle = ' || (SELECT count(*) FROM awards);
SELECT 'cycle_prize_total = ' || (SELECT COALESCE(SUM(prize_points),0) FROM awards);
SELECT 'my_jury_progress = ' || (SELECT count(*) FROM ballot b JOIN users u ON u.id=b.juror_id WHERE u.employee_code='E-PR')
  || ' of ' || (SELECT count(*) FROM jury_assignment j JOIN users u ON u.id=j.user_id WHERE u.employee_code='E-PR') || ' assigned';
SELECT '-- notifications --';
SELECT 'unread_for_E-PR = ' || count(*) FROM notification WHERE user_id=(SELECT id FROM users WHERE employee_code='E-PR') AND read_at IS NULL;
SELECT '-- me/stats --';
SELECT 'balance = ' || COALESCE((SELECT balance FROM points_wallet WHERE user_id = (SELECT id FROM users WHERE employee_code='E-PR')), 0);
SELECT 'allowance_left = ' || (SELECT balance || ' / ' || allocated FROM to_recog_points WHERE user_id = (SELECT id FROM users WHERE employee_code='E-PR'));
SQL
echo "== done =="
