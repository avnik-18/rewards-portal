-- Purge ALL data back to the migration-built structure only:
-- tables, functions, triggers, fiscal anchor, SYS ledger accounts.
-- Every business row (users, rules, settings, workflow history) is deleted.
-- Idempotent; leaves an EMPTY, ready-for-API database.
DELETE FROM approval_item_step;
DELETE FROM approval_item;
UPDATE journal_entry SET linked_recognition_id = NULL, linked_award_id = NULL;
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
DELETE FROM job_run;
DELETE FROM ledger;
DELETE FROM journal_line;
DELETE FROM journal_entry;
DELETE FROM ledger_account WHERE kind = 'user_wallet';
DELETE FROM points_wallet;
DELETE FROM to_recog_points;
DELETE FROM verify2;
DELETE FROM verify_results;
DELETE FROM role_assignment;
DELETE FROM budget_policy;
DELETE FROM admin_setting;
DELETE FROM admin_setting_key;
DELETE FROM milestone_rule;
DELETE FROM approval_rule_step;
DELETE FROM approval_rule;
DELETE FROM recognition_templates;
DELETE FROM emids_values;
DELETE FROM users;
SELECT 'users='||(SELECT count(*) FROM users)
    || ' allowances='||(SELECT count(*) FROM to_recog_points)
    || ' recognitions='||(SELECT count(*) FROM recognition_history)
    || ' ledger='||(SELECT count(*) FROM ledger) || ' empty' AS state;
