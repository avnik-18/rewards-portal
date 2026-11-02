-- OPTIONAL demo seed for development and verification suites.
-- Ship with an empty database; run this ONLY when you need demo data
-- (it is what `scripts/db-verify.sh` and `scripts/e2e_recognize.py` expect).
-- Creates: the L3←L2←L1 staff chain + 4 employees, routing rules
-- (>100 → L1, >200 → L1·L2·L3), two admins, emids values, admin settings,
-- budget policy, and one quarter of 250/250 allowances for the active period.
INSERT INTO emids_values (key, label) VALUES
  ('customer_first','Customer First'),
  ('innovation','Innovation'),
  ('collaboration','Collaboration'),
  ('ownership','Ownership'),
  ('winning_mindset','Winning Mindset')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_setting_key (key, label, data_type, allowed_range, is_program_policy) VALUES
  ('slack_echo','Mirror posts to Slack', 'bool', NULL, false),
  ('manager_weekly_digest','Weekly digest to people managers','bool', NULL, false),
  ('email_alerts','Email alerts','bool', NULL, false),
  ('milestone_feed','Milestone posts to feed','bool', NULL, false),
  ('points_expiry_months','Points expiry in months','int', '{"min":1}'::jsonb, true),
  ('reciprocity_window_days','Reciprocity flag window','int','{"min":0}'::jsonb, true),
  ('giver_daily_points_cap','Giver daily points cap','int','{"min":1}'::jsonb, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_setting (key, value) VALUES
  ('slack_echo','true'::jsonb),
  ('manager_weekly_digest','true'::jsonb),
  ('email_alerts','true'::jsonb),
  ('milestone_feed','false'::jsonb),
  ('points_expiry_months','12'::jsonb),
  ('reciprocity_window_days','7'::jsonb),
  ('giver_daily_points_cap','500'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO budget_policy (version, grants, quarterly_allowance, recipient_cap_per_period, carry_over, effective_from)
  VALUES (1, 'all', 250, 150, false, now())
  ON CONFLICT DO NOTHING;

INSERT INTO approval_rule (kind, version, min_points, max_points, priority, version_note) VALUES
  ('points_recognition', 1, 0,   100, 1, 'auto-approve: zero-step rule band'),
  ('points_recognition', 1, 101, 200, 2, 'L1 manager approves'),
  ('points_recognition', 1, 201, NULL, 3, 'L1 -> L2 -> L3 (finance head)'),
  ('award_endorsement',  1, NULL, NULL, 1, 'nomination endorsement chain')
ON CONFLICT DO NOTHING;

-- band 2: single step, the giver's L1 manager
INSERT INTO approval_rule_step (rule_id, seq, level, subject, fixed_user_id, mode)
  SELECT r.id, 1, 'L1'::approval_level, 'submitter_manager'::approver_subject, NULL, 'ANY'::approver_mode
    FROM approval_rule r WHERE r.kind='points_recognition' AND r.priority=2
  ON CONFLICT DO NOTHING;

-- band 3: L1 then L2 from the giver's org walk
INSERT INTO approval_rule_step (rule_id, seq, level, subject, fixed_user_id, mode)
  SELECT r.id, s.seq, s.level::approval_level, s.subject::approver_subject, NULL, 'ANY'::approver_mode
    FROM (VALUES (1,'L1','submitter_manager'),(2,'L2','submitter_manager_manager')) AS s(seq, level, subject)
    CROSS JOIN approval_rule r
   WHERE r.kind='points_recognition' AND r.priority=3
  ON CONFLICT DO NOTHING;

INSERT INTO users (employee_code, email, full_name, title, department) VALUES
  ('E-L3','l3@emids.test','Arun Kamath','Finance Head','Finance'),
  ('E-L2','l2@emids.test','Lena Mathew','Delivery Director','Delivery'),
  ('E-L1','l1@emids.test','Sam Fernandes','Engineering Manager','Engineering'),
  ('E-RH','rahul@emids.test','Rahul Nair','Engineer','Engineering'),
  ('E-PR','priya@emids.test','Priya Rao','Engineer','Engineering'),
  ('E-AJ','arjun@emids.test','Arjun Pillai','QA Lead','Engineering'),
  ('E-BR','brooke@emids.test','Brooke Davis','Executive Assistant','Operations'),
  ('E-009','admin@emids.test','Deepa Menon','Program Admin','People')
ON CONFLICT (employee_code) DO NOTHING;

UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-L3') WHERE employee_code='E-L2';
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-L2') WHERE employee_code='E-L1';
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-L1')
  WHERE employee_code IN ('E-RH','E-PR','E-AJ','E-BR');

-- band 3's final fixed step is the finance head (L3 user)
INSERT INTO approval_rule_step (rule_id, seq, level, subject, fixed_user_id, mode)
  SELECT r.id, 3, 'L3'::approval_level, 'fixed_user'::approver_subject,
         (SELECT id FROM users WHERE employee_code='E-L3'), 'ANY'::approver_mode
    FROM approval_rule r
   WHERE r.kind='points_recognition' AND r.priority=3
  ON CONFLICT DO NOTHING;

INSERT INTO role_assignment (user_id, role)
  SELECT id, 'admin'::app_role FROM users WHERE employee_code IN ('E-L3','E-L1','E-009')
  ON CONFLICT DO NOTHING;

SELECT fn_allowance_seed(f.id)
  FROM fiscal_period f
 WHERE now()::date BETWEEN f.starts AND f.ends;
