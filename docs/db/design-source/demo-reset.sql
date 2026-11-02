-- one-shot demo reset: break FK cycles explicitly, children first
DELETE FROM approval_item_step;
DELETE FROM approval_item;
UPDATE journal_entry SET linked_recognition_id = NULL, linked_award_id = NULL; -- break cycles
DELETE FROM recognition_pending;
DELETE FROM recognition_recipients;
DELETE FROM ballot;
DELETE FROM jury_assignment;
UPDATE awards SET winner_nomination_id = NULL;
DELETE FROM awards_nominations;
DELETE FROM awards;
DELETE FROM recognition_history;
DELETE FROM notification;
DELETE FROM outbox_event;
DELETE FROM audit_log;
DELETE FROM ledger;
DELETE FROM journal_line;
DELETE FROM journal_entry;
DELETE FROM ledger_account WHERE kind='user_wallet';
DELETE FROM points_wallet;
DELETE FROM to_recog_points;
UPDATE users SET employment_status = 'active' WHERE employment_status <> 'active'; -- unwound leaver tests

INSERT INTO to_recog_points (user_id, period_id, allocated, balance)
  SELECT u.id, (SELECT id FROM fiscal_period WHERE name='FY26 Q4'), 250, 250
    FROM users u
   WHERE COALESCE(u.recognition_eligible, u.employment_status = 'active');
INSERT INTO ledger_account (code, kind, allowance_id)
  SELECT 'allow:' || t.user_id, 'user_wallet', t.id FROM to_recog_points t
  ON CONFLICT (code) DO UPDATE SET allowance_id = EXCLUDED.allowance_id;
SELECT 'users='||(SELECT count(*) FROM users) || ' allocs='||(SELECT count(*) FROM to_recog_points) || ' accounts='||
  (SELECT count(*) FROM ledger_account WHERE kind='user_wallet') AS state;
