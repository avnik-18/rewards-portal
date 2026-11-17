-- OPTIONAL demo seed for development and verification suites.
-- Ship with an empty database; run this ONLY when you need demo data
-- (it is what `scripts/db-verify.sh` expects).
-- Creates: the L3←L2←L1 staff chain + 4 employees, routing rules
-- (>100 → L1, >200 → L1·L2·L3), three admins (E-009 program admin), emids values, admin settings,
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

-- reference data: the active fiscal period is seeded here, not in a migration —
-- production periods arrive through the admin flow. The allowance seeding
-- below needs it, so it must exist before fn_allowance_seed runs.
INSERT INTO fiscal_period (id, name, starts, ends)
VALUES ('11111111-1111-1111-1111-111111111101', 'FY26 Q4', '2026-10-01', '2026-12-31')
ON CONFLICT (name) DO NOTHING;

SELECT fn_allowance_seed(f.id)
  FROM fiscal_period f
 WHERE now()::date BETWEEN f.starts AND f.ends;

-- demo media: one hero carousel video + two news banners (URL links only;
-- the media lives on the CDN). Guarded per placement kind so a re-run fills
-- what is missing without resurrecting banners an admin already replaced.
INSERT INTO media_asset (kind, title, url, poster_url, cta_label, cta_url, sort_order)
SELECT v.* FROM (VALUES
  ('hero_carousel_video'::media_kind,
   'Q4 townhall — season kickoff',
   'https://cdn.emids.test/media/hero-q4-townhall.mp4',
   'https://cdn.emids.test/media/hero-q4-townhall-frame.jpg',
   'Watch the replay'::text,
   'https://intranet.emids.test/townhall',
   0)
) AS v(kind, title, url, poster_url, cta_label, cta_url, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM media_asset WHERE kind = 'hero_carousel_video');

INSERT INTO media_asset (kind, title, url, poster_url, cta_label, cta_url, sort_order)
SELECT v.* FROM (VALUES
  ('news_banner'::media_kind,
   'Diwali week logistics',
   'https://cdn.emids.test/media/banners/diwali-2026.png',
   NULL,
   'See schedule',
   'https://intranet.emids.test/diwali-week',
   1),
  ('news_banner'::media_kind,
   'FY26 Q1 award nominations open',
   'https://cdn.emids.test/media/banners/awards-fy26q1.png',
   NULL,
   'Nominate now',
   'https://intranet.emids.test/awards-nominate',
   2)
) AS v(kind, title, url, poster_url, cta_label, cta_url, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM media_asset WHERE kind = 'news_banner');

-- ===== composer demo: one praise template per EMIDS value (5 total) =====
-- Shapes follow the GET /values read-path: values carry art_json with a
-- 'urls' array; templates key by (value_id, name), is_active by default.
INSERT INTO recognition_templates (value_id, name, emoji, art_json, prefill)
SELECT e.id, v2.name, v2.emoji, v2.art, v2.prefill
FROM (VALUES
  ('customer_first','Customer First','🤝','{"urls":["https://cdn.emids.test/templates/customer-first-01.webp","https://cdn.emids.test/templates/customer-first-02.webp"]}'::jsonb,'Thank you for putting the customer at the centre of…'),
  ('innovation','Innovation','💡','{"urls":["https://cdn.emids.test/templates/innovation-01.webp"]}'::jsonb,'Thank you for finding a new way to…'),
  ('collaboration','Collaboration','👥','{"urls":["https://cdn.emids.test/templates/collaboration-01.webp"]}'::jsonb,'Thank you for pulling the group through…'),
  ('ownership','Ownership','🎯','{"urls":["https://cdn.emids.test/templates/ownership-01.webp"]}'::jsonb,'Thank you for owning the outcome when…'),
  ('winning_mindset','Winning Mindset','🏆','{"urls":["https://cdn.emids.test/templates/winning-mindset-01.webp"]}'::jsonb,'Thank you for raising the bar with…')
) AS v2(key, name, emoji, art, prefill)
JOIN emids_values e ON e.key = v2.key
ON CONFLICT (value_id, name) DO NOTHING;
