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
   'https://embed.wistia.com/deliveries/95422e5b5fe4bf5888f2a9e4feee0ef237a1faa1.mp4',
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
-- Six-person Platform, five-person Finance Ops, three-person Mobile — the
-- server identities in those teams get a team-scoped leaderboard per caller;
-- E-BR and E-009 sit in NO team and hit the receivers+caller fallback on
-- purpose. Idempotent: re-running fills only what is missing (recognition
-- rows key on (kind, source_ref)).

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
-- Platform: Priya 75 ( giver Rahul ) / Erica 40 ( giver Arjun ). Rahul and
-- Brooke stay at zero for the pinned-row verdict exposure.
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

-- ===== awards catalog (admin-authored; /awards + /awards/showcase) =====
-- `awards` keys on (period_id, name) via UNIQUE, so re-running is safe.
-- The demo's stand-in for the admin authoring flow: cadence, quota and the
-- Guidelines sections (eligibility / applicability) are all row data.
-- Timelines are CURRENT_DATE-relative mocks so every re-run shows the same
-- urgency states (Pat on the Back = the closing-soon rack item).
-- demo's three original EoQ rows stay retired (cancelled) — historical rows.
UPDATE awards SET phase = 'cancelled' WHERE name LIKE 'Employee of the Quarter%';

-- the annual window the three squad awards run in
INSERT INTO fiscal_period (id, name, starts, ends)
VALUES ('11111111-1111-1111-1111-111111111102', 'FY27', '2027-01-01', '2027-12-31')
ON CONFLICT (name) DO NOTHING;

INSERT INTO awards (period_id, name, description, cadence, prize_points,
                    max_nominations_per_nominator,
                    requires_jury, phase, nominations_end, guidelines)
VALUES
  ((SELECT id FROM fiscal_period WHERE name = 'FY26 Q4'), 'Pat on the Back',
   'A cheer for the teammate whose everyday work deserves applause — recognised fast, city by city.',
   'quarterly'::award_cadence, 2500, 1, false, 'nominations'::cycle_phase,
   (CURRENT_DATE + 4),
   '[{"title":"Eligibility","lines":["All emidsians"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb),
  ((SELECT id FROM fiscal_period WHERE name = 'FY26 Q4'), 'Powerhouse Performer',
   'For the engine room — consistent, relentless delivery from individual contributors up to Lead L2.',
   'quarterly'::award_cadence, 2500, 1, false, 'nominations'::cycle_phase,
   (CURRENT_DATE + 16),
   '[{"title":"Eligibility","lines":["Up to Lead L2"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb),
  ((SELECT id FROM fiscal_period WHERE name = 'FY27'), 'Super Squad',
   'Honoring teams of five or more that ship as one unit — the squad takes the podium together.',
   'annual'::award_cadence, 10000, 8, false, 'nominations'::cycle_phase,
   (CURRENT_DATE + 22),
   '[{"title":"Eligibility","lines":["Teams with 5 or more team members"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb),
  ((SELECT id FROM fiscal_period WHERE name = 'FY27'), 'CEO Award',
   'The CEO''s personal recognition for the team that best represents EMIDS''s values and outcomes.',
   'annual'::award_cadence, 20000, 1, true, 'nominations'::cycle_phase,
   (CURRENT_DATE + 120),
   '[{"title":"Eligibility","lines":["Teams with 5 or more team members"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb),
  ((SELECT id FROM fiscal_period WHERE name = 'FY27'), 'Stellar Squad',
   'Celebrating a squad that shone all year — measurable results, mentorship and team spirit.',
   'annual'::award_cadence, 10000, 1, true, 'nominations'::cycle_phase,
   (CURRENT_DATE + 60),
   '[{"title":"Eligibility","lines":["Teams with 5 or more team members"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb)
ON CONFLICT (period_id, name) DO UPDATE
  SET description = EXCLUDED.description,
      cadence = EXCLUDED.cadence,
      prize_points = EXCLUDED.prize_points,
      max_nominations_per_nominator = EXCLUDED.max_nominations_per_nominator,
      requires_jury = EXCLUDED.requires_jury,
      phase = EXCLUDED.phase,
      nominations_end = EXCLUDED.nominations_end,
      guidelines = EXCLUDED.guidelines;

-- ===== bell demo: the recipient's unread praise rows =====
-- The live fn_notify copies each recipient's SHARE into payload->>'points';
-- the seed mirrors that spelling (NOT the giver's total) so the panel shows
-- the same magnitudes a real submit would. Rows key on the dedupe_key
-- UNIQUE(PATERNALLY partial index), so a re-run adds nothing; read_at stays
-- NULL so the badge and panel light up on a fresh database like the demo
-- expects.
INSERT INTO notification (user_id, type, channel, payload, delivery_status, dedupe_key)
SELECT rh_rec.user_id, 'praise_received', 'in_app',
       jsonb_build_object('points', rh_rec.points),
       'queued',
       'praise:' || rh_rec.recognition_id || ':' || rh_rec.user_id
FROM (SELECT rr.user_id, rr.points, rr.recognition_id
        FROM recognition_recipients rr
        JOIN recognition_history rh ON rh.id = rr.recognition_id
       WHERE rh.source_ref IN ('leaderboard-demo-A-01','leaderboard-demo-A-02',
                               'leaderboard-demo-B-01','leaderboard-demo-B-02',
                               'leaderboard-demo-B-03','leaderboard-demo-C-01')
         AND rr.kind = 'to') rh_rec
WHERE NOT EXISTS (
  SELECT 1 FROM notification n WHERE n.dedupe_key = 'praise:' || rh_rec.recognition_id || ':' || rh_rec.user_id);
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

-- ===== dashboard feed demo: published recognitions for the post feed =====
-- feed_post (migration 0023) is the publication contract: the live pipeline
-- writes rows only AFTER the approval chain fully resolves, so a recognition
-- without a row never reaches the feed and is_public=false is the unpublish
-- case. Everything below is idempotent on the entity UNIQUE.
-- Scope demo cards: the six leaderboard recognitions publish as team-scope
-- rows (is_bu=false); one BU/org-level milestone (E-009 -> E-BR, base 250)
-- publishes with is_bu=true so every persona sees a headline first; one
-- approved recognition stays is_public=false (must never surface); one
-- pending row goes through the real submit fn (holds + chain) and gets NO
-- feed_post row — proving pending never leaks via status alone.

INSERT INTO feed_post (kind, entity_type, entity_id, is_public, actor_id, occurred_at, is_bu)
SELECT 'recognition', 'recognition', rh.id, true, rh.from_user_id, rh.occurred_at, false
  FROM recognition_history rh
 WHERE rh.status = 'approved' AND rh.source_ref LIKE 'leaderboard-demo-%'
ON CONFLICT (entity_type, entity_id) DO NOTHING;

INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'milestone', u.id, (SELECT id FROM emids_values WHERE key='winning_mindset'),
       'Business-unit town hall: FY26 Q4 opens with the highest customer-excellence renewal rate on record.',
       250, 'approved'::recognition_status, now(), 'feed-demo-BU-01'
  FROM users u
 WHERE u.employee_code = 'E-009'
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, ru.id, rh.base_points, 'to'
  FROM recognition_history rh
  JOIN users ru ON ru.employee_code = 'E-BR'
 WHERE rh.source_ref = 'feed-demo-BU-01' AND rh.kind = 'milestone'
   AND NOT EXISTS (SELECT 1 FROM recognition_recipients r WHERE r.recognition_id = rh.id);

INSERT INTO feed_post (kind, entity_type, entity_id, is_public, actor_id, occurred_at, is_bu)
SELECT 'recognition', 'recognition', rh.id, true, rh.from_user_id, rh.occurred_at, true
  FROM recognition_history rh
 WHERE rh.source_ref = 'feed-demo-BU-01'
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- approved but unpublished: proves is_public=false keeps a row off the feed
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', fu.id, (SELECT id FROM emids_values WHERE key='innovation'),
       'Internal drafter — this moment stays private until the BU review signs off.',
       30, 'approved'::recognition_status, now(), 'feed-demo-hidden-01'
  FROM users fu
 WHERE fu.employee_code = 'E-AJ'
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, ru.id, rh.base_points, 'to'
  FROM recognition_history rh
  JOIN users ru ON ru.employee_code = 'E-FT'
 WHERE rh.source_ref = 'feed-demo-hidden-01' AND rh.kind = 'praise'
   AND NOT EXISTS (SELECT 1 FROM recognition_recipients r WHERE r.recognition_id = rh.id);

INSERT INTO feed_post (kind, entity_type, entity_id, is_public, actor_id, occurred_at, is_bu)
SELECT 'recognition', 'recognition', rh.id, false, rh.from_user_id, rh.occurred_at, false
  FROM recognition_history rh
 WHERE rh.source_ref = 'feed-demo-hidden-01'
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- pending via the real submit path (wallet holds + approval chain): 120 pts
-- routes to the L1 band-2 rule, so the chain AND the feed gate both engage.
-- The fixed idempotency key makes re-runs of the seed a single recognition.
SELECT fn_submit_recognition(
         (SELECT id FROM users WHERE employee_code = 'E-ES'),
         ARRAY[(SELECT id FROM users WHERE employee_code = 'E-PR')],
         NULL,
         (SELECT id FROM emids_values WHERE key = 'collaboration'),
         NULL,
         'Feed demo: Priya carried Erica through the flaky pipeline migration.',
         120,
         NULL, 'praise', '11111111-2222-3333-4444-555555555501'
       )
 WHERE NOT EXISTS (
   SELECT 1 FROM recognition_history
    WHERE idempotency_key = '11111111-2222-3333-4444-555555555501');
