-- read-only sanity sweep on the pristine DB
SELECT 'wallet drift (expect 0 rows)' AS tbl,
       (SELECT count(*) FROM vw_wallet_reconcile WHERE drift <> 0) AS bad;
SELECT 'journal imbalance (expect 0 rows)' AS tbl,
       (SELECT count(*) FROM (SELECT journal_id FROM journal_line GROUP BY journal_id
          HAVING SUM(CASE WHEN direction='debit' THEN amount ELSE -amount END) <> 0) x) AS bad;
SELECT 'orphan queue rows (expect 0)' AS tbl,
       (SELECT count(*) FROM recognition_pending) AS bad;
SELECT 'org tree integrity (expect 0)' AS tbl,
       (SELECT count(*) FROM users u WHERE u.manager_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM users m WHERE m.id = u.manager_id)) AS bad;
SELECT 'staff without allowance (expect 0)' AS tbl,
       (SELECT count(*) FROM users u
         WHERE COALESCE(u.recognition_eligible, u.employment_status='active')
           AND NOT EXISTS (SELECT 1 FROM to_recog_points t WHERE t.user_id = u.id
                           AND t.balance = t.allocated AND t.allocated = 250)) AS bad;
SELECT 'dir api superset check' AS tbl,
       (SELECT count(*) FROM users) || ' users; mock-free fields only' AS bad;
