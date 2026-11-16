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

-- ===== groups/leaderboard demo: 3 teams (6/5/3 = 14 users) =====
-- Six-person Platform, five-person Finance Ops, three-person Mobile — every
-- seeded user lands in exactly one team so the leaderboard (scoped to the
-- caller's teams) differs per identity. Idempotent: re-running fills only
-- what is missing (recognition rows key on (kind, source_ref)).

INSERT INTO users (employee_code, email, full_name, title, department) VALUES
  ('E-ES','erica@emids.test','Erica Stone','Engineer','Engineering'),
  ('E-FT','fibin@emids.test','Fibin Thomas','Engineer','Engineering'),
  ('E-GI','gautam@emids.test','Gautam Iyer','Engineer','Engineering'),
  ('E-HK','hema@emids.test','Hema Krish','Analyst','Finance'),
  ('E-IC','ivan@emids.test','Ivan D''Costa','Analyst','Finance'),
  ('E-JS','jay@emids.test','Jay Shah','Ops Lead','Finance'),
  ('E-KM','kiran@emids.test','Kiran Menon','Mobile Engineer','Engineering'),
  ('E-DN','divya@emids.test','Divya Nair','Mobile Designer','Engineering')
ON CONFLICT (employee_code) DO NOTHING;

UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-L1')
  WHERE employee_code IN ('E-ES','E-FT','E-GI','E-KM','E-DN');
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-L3')
  WHERE employee_code IN ('E-HK','E-IC','E-JS');

-- allowances for the new joiners (the fn tops up only missing rows)
SELECT fn_allowance_seed(f.id)
  FROM fiscal_period f
 WHERE now()::date BETWEEN f.starts AND f.ends;

INSERT INTO teams (name, code, project_name, description) VALUES
  ('Platform','PLT','Springboard services','Six-member product platform group'),
  ('Finance Ops','FOP','Quarterly reconciliation','Five-member finance operations group'),
  ('Mobile','MOB','Field companion app','Three-member mobile squad')
ON CONFLICT (name) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role)
SELECT t.id, u.id, v.role::team_member_role
FROM (VALUES
  ('Platform','E-RH','lead'),
  ('Platform','E-PR','member'),
  ('Platform','E-AJ','member'),
  ('Platform','E-ES','member'),
  ('Platform','E-FT','member'),
  ('Platform','E-GI','member'),
  ('Finance Ops','E-L2','lead'),
  ('Finance Ops','E-L3','member'),
  ('Finance Ops','E-HK','member'),
  ('Finance Ops','E-IC','member'),
  ('Finance Ops','E-JS','member'),
  ('Mobile','E-L1','lead'),
  ('Mobile','E-KM','member'),
  ('Mobile','E-DN','member')
) AS v(team_name, employee_code, role)
JOIN teams t  ON t.name = v.team_name
JOIN users u  ON u.employee_code = v.employee_code
WHERE NOT EXISTS (
  SELECT 1 FROM team_members m
   WHERE m.team_id = t.id AND m.user_id = u.id AND m.valid_to IS NULL);

-- grouped demo recognitions — approved so the boards light up per group.
-- Platform: Rahul 75 / Priya 50 / Brooke 15 / Erica 40 (giver: Rahul)
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', u.id, (SELECT id FROM emids_values WHERE key='ownership'),
       v.msg, v.base, 'approved'::recognition_status, now(), v.ref
FROM (VALUES
  ('leaderboard-demo-A-01','E-RH','Rahul kept the release trains on time.',75),
  ('leaderboard-demo-A-02','E-AJ','Erica rebuilt the oncall runbook when the pagers blew up.',40)
) AS v(ref, code, msg, base)
JOIN users u ON u.employee_code = v.code
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, ru.id, rh.base_points, 'to'
FROM recognition_history rh
JOIN users fu ON fu.id = rh.from_user_id
JOIN users ru ON ru.employee_code = CASE fu.employee_code
       WHEN 'E-RH' THEN 'E-PR' ELSE 'E-ES' END
WHERE rh.source_ref IN ('leaderboard-demo-A-01','leaderboard-demo-A-02')
  AND NOT EXISTS (
    SELECT 1 FROM recognition_recipients r WHERE r.recognition_id = rh.id);

-- Finance Ops: Lena 180 / Arun 200 / Hema 90 (giver: the program admin)
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', u.id, (SELECT id FROM emids_values WHERE key='customer_first'),
       v.msg, v.base, 'approved'::recognition_status, now(), v.ref
FROM (VALUES
  ('leaderboard-demo-B-01','Lena closed the reconciliation gap four days early.',180,'E-L2'),
  ('leaderboard-demo-B-02','Arun surfaced the double-charge before finance closed.',200,'E-L3'),
  ('leaderboard-demo-B-03','Hema fixed the recurring billing leak within a day.',90,'E-HK')
) AS v(ref, msg, base, rec_code)
JOIN users u ON u.employee_code = 'E-009'
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, ru.id, rh.base_points, 'to'
FROM recognition_history rh
JOIN (VALUES
        ('leaderboard-demo-B-01','E-L2'),
        ('leaderboard-demo-B-02','E-L3'),
        ('leaderboard-demo-B-03','E-HK')
     ) AS v(ref, rec_code)
  ON v.ref = rh.source_ref
JOIN users ru ON ru.employee_code = v.rec_code
WHERE rh.source_ref IN ('leaderboard-demo-B-01','leaderboard-demo-B-02','leaderboard-demo-B-03')
  AND rh.kind = 'praise'
  AND NOT EXISTS (
    SELECT 1 FROM recognition_recipients r WHERE r.recognition_id = rh.id);

-- Mobile: Kiran 40 (giver: Sam); Sam/Divy stay at zero — the pinned rule
-- still shows them (façade) even from the bottom of a 3-member group.
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', u.id, (SELECT id FROM emids_values WHERE key='ownership'),
       'Kiran shipped the offline sync that unblocked two quarters of field work.', 40,
       'approved'::recognition_status, now(), 'leaderboard-demo-C-01'
FROM users u WHERE u.employee_code = 'E-L1'
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, u.id, rh.base_points, 'to'
FROM recognition_history rh
JOIN users u ON u.employee_code = 'E-KM'
WHERE rh.source_ref = 'leaderboard-demo-C-01'
  AND NOT EXISTS (
    SELECT 1 FROM recognition_recipients r WHERE r.recognition_id = rh.id);
