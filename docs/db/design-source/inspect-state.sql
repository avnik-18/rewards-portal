SELECT 'users' AS t, count(*) FROM users
UNION ALL SELECT 'allowance rows', count(*) FROM to_recog_points
UNION ALL SELECT 'points wallets', count(*) FROM points_wallet
UNION ALL SELECT 'emids values', count(*) FROM emids_values
UNION ALL SELECT 'approval rules', count(*) FROM approval_rule
UNION ALL SELECT 'staff roles', count(*) FROM role_assignment
UNION ALL SELECT 'budget policies', count(*) FROM budget_policy
UNION ALL SELECT 'system accounts', count(*) FROM ledger_account WHERE kind='system'
UNION ALL SELECT 'user accounts', count(*) FROM ledger_account WHERE kind='user_wallet'
UNION ALL SELECT 'recognitions', count(*) FROM recognition_history
UNION ALL SELECT 'approvals pending', count(*) FROM recognition_pending
UNION ALL SELECT 'ledger rows', count(*) FROM ledger
UNION ALL SELECT 'notifications', count(*) FROM notification
UNION ALL SELECT 'milestone rules', count(*) FROM milestone_rule;
