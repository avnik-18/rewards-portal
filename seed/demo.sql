-- OPTIONAL demo seed for development and verification suites.
-- Ship with an empty database; run this ONLY when you need demo data
-- (it is what `scripts/db-verify.sh` expects).
-- Creates: the L3←L2←L1 staff chain + 4 employees, routing rules
-- (>100 → L1, >200 → L1·L2·L3), three admins (E-009 program admin), emids values, admin settings,
-- budget policy, and one quarter of 250/250 allowances for the active period.
-- the three program values (renamed in place by 0030_cheers_direct_values;
-- this insert is the no-op guard for re-runs)
INSERT INTO emids_values (key, label) VALUES
  ('impact_obsessed','Impact Obsessed'),
  ('trusted_guides','Trusted Guides'),
  ('inclusive_innovators','Inclusive Innovators')
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
  SELECT id, 'admin'::app_role FROM users WHERE employee_code IN ('E-L3','E-009')
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

-- grouped demo recognitions — approved, zero-point cheers for peers.
-- Praise carries no points (only awards do) across the whole catalog.
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', u.id, (SELECT id FROM emids_values WHERE key='impact_obsessed'),
       v.msg, 0, 'approved'::recognition_status, now(), v.ref
FROM (VALUES
  ('leaderboard-demo-A-01','E-RH','Rahul kept the release trains on time.'),
  ('leaderboard-demo-A-02','E-AJ','Erica rebuilt the oncall runbook when the pagers blew up.')
) AS v(ref, code, msg)
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

-- Finance Ops: Lena / Arun / Hema — zero-point cheers (giver: the program admin)
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', u.id, (SELECT id FROM emids_values WHERE key='trusted_guides'),
       v.msg, 0, 'approved'::recognition_status, now(), v.ref
FROM (VALUES
  ('leaderboard-demo-B-01','Lena closed the reconciliation gap four days early.','E-L2'),
  ('leaderboard-demo-B-02','Arun surfaced the double-charge before finance closed.','E-L3'),
  ('leaderboard-demo-B-03','Hema fixed the recurring billing leak within a day.','E-HK')
) AS v(ref, msg, rec_code)
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

-- Mobile: Kiran (giver: Sam) — zero-point cheer for the peer feed.
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT 'praise', u.id, (SELECT id FROM emids_values WHERE key='impact_obsessed'),
       'Kiran shipped the offline sync that unblocked two quarters of field work.', 0,
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
                    requires_jury, phase, nominations_start, nominations_end,
                    guidelines, approval_start, approval_end)
VALUES
  ((SELECT id FROM fiscal_period WHERE name = 'FY26 Q4'), 'Pat on the Back',
   'A cheer for the teammate whose everyday work deserves applause — recognised fast, city by city.',
   'quarterly'::award_cadence, 2500, 1, false, 'nominations'::cycle_phase,
   (CURRENT_DATE - 14), (CURRENT_DATE + 4),
   '[{"title":"Eligibility","lines":["All emidsians"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb,
   (CURRENT_DATE - 2), (CURRENT_DATE + 10)),
  ((SELECT id FROM fiscal_period WHERE name = 'FY26 Q4'), 'Powerhouse Performer',
   'For the engine room — consistent, relentless delivery from individual contributors up to Lead L2.',
   'quarterly'::award_cadence, 2500, 1, false, 'nominations'::cycle_phase,
   (CURRENT_DATE - 14), (CURRENT_DATE + 16),
   '[{"title":"Eligibility","lines":["Up to Lead L2"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb,
   (CURRENT_DATE - 1), (CURRENT_DATE + 25)),
  ((SELECT id FROM fiscal_period WHERE name = 'FY27'), 'Super Squad',
   'Honoring teams of five or more that ship as one unit — the squad takes the podium together.',
   'annual'::award_cadence, 10000, 8, false, 'nominations'::cycle_phase,
   (CURRENT_DATE - 14), (CURRENT_DATE + 22),
   '[{"title":"Eligibility","lines":["Teams with 5 or more team members"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb,
   (CURRENT_DATE + 5), (CURRENT_DATE + 18)),
  ((SELECT id FROM fiscal_period WHERE name = 'FY27'), 'CEO Award',
   'The CEO''s personal recognition for the team that best represents EMIDS''s values and outcomes.',
   'annual'::award_cadence, 20000, 1, true, 'nominations'::cycle_phase,
   (CURRENT_DATE - 14), (CURRENT_DATE + 120),
   '[{"title":"Eligibility","lines":["Teams with 5 or more team members"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb,
   (CURRENT_DATE - 7), (CURRENT_DATE + 95)),
  ((SELECT id FROM fiscal_period WHERE name = 'FY27'), 'Stellar Squad',
   'Celebrating a squad that shone all year — measurable results, mentorship and team spirit.',
   'annual'::award_cadence, 10000, 1, true, 'nominations'::cycle_phase,
   (CURRENT_DATE - 14), (CURRENT_DATE + 60),
   '[{"title":"Eligibility","lines":["Teams with 5 or more team members"]},
     {"title":"Applicability","lines":["Delivery","Sales","Practices","CP groups","Corporate Function"]}]'::jsonb,
   (CURRENT_DATE + 9), (CURRENT_DATE + 21))
ON CONFLICT (period_id, name) DO UPDATE
  SET description = EXCLUDED.description,
      cadence = EXCLUDED.cadence,
      prize_points = EXCLUDED.prize_points,
      max_nominations_per_nominator = EXCLUDED.max_nominations_per_nominator,
      requires_jury = EXCLUDED.requires_jury,
      phase = EXCLUDED.phase,
      nominations_start = EXCLUDED.nominations_start,
      nominations_end = EXCLUDED.nominations_end,
      guidelines = EXCLUDED.guidelines,
      approval_start = EXCLUDED.approval_start,
      approval_end = EXCLUDED.approval_end;

-- ===== nomination compose gates (0035) =====
-- eligibility JSONB the /nominations service reads (allow_self, grades,
-- member_level_max) and the demo directory grade pinned for VP/SVP personas.
UPDATE awards SET eligibility = '{"all_eligible": true, "allow_self": true, "allow_team": false, "min_team_size": 1}'::jsonb
 WHERE name = 'Pat on the Back' AND eligibility IS NULL;
UPDATE awards SET eligibility = '{"all_eligible": true, "member_level_max": "L2", "allow_self": false, "allow_team": false, "min_team_size": 1}'::jsonb
 WHERE name = 'Powerhouse Performer' AND eligibility IS NULL;
UPDATE awards SET eligibility = '{"all_eligible": true, "allow_self": false, "allow_team": true, "min_team_size": 5}'::jsonb
 WHERE name = 'Super Squad' AND eligibility IS NULL;
UPDATE awards SET eligibility = '{"all_eligible": false, "grades": ["VP", "SVP"], "allow_self": false, "allow_team": false, "min_team_size": 1}'::jsonb
 WHERE name = 'CEO Award' AND eligibility IS NULL;
UPDATE awards SET eligibility = '{"all_eligible": false, "grades": ["L1", "L2", "L3", "L5", "VP", "SVP"], "allow_self": false, "allow_team": true, "min_team_size": 5}'::jsonb
 WHERE name = 'Stellar Squad' AND eligibility IS NULL;
UPDATE users SET grade = 'VP'  WHERE employee_code = 'E-HD' AND (grade IS NULL OR grade = 'L5');
UPDATE users SET grade = 'SVP' WHERE employee_code = 'E-009' AND (grade IS NULL OR grade = 'L5');

-- ===== awards tile demo copy: day-one content for the live period (0028) =====
-- The tile's figure is DERIVED (fn_awards_tile sums the live awards) — copy is
-- authored; the {points} token is substituted client-side. Keyed on the period
-- PK, so a re-run never overwrites a demo run's admin edits.
INSERT INTO awards_cycle_content (period_id, headline, tagline, updated_by)
SELECT a.period_id,
       'Awards worth {points} pts this quarter',
       'Nominate the teammates who lived our values this quarter.',
       (SELECT id FROM users WHERE employee_code = 'E-009')
FROM awards a
WHERE a.phase <> 'cancelled'
ON CONFLICT (period_id) DO NOTHING;

-- ===== award winners on the feed: two demo wins (0024 rework) =====
-- kind='award' recognition rows: the award itself + the winner recipient
-- list + the nominator as from_user — the feed renders its own gold winner
-- card from these (schema forces source_ref IS NULL for award rows;
-- idempotent on the award_id). Winner phase rows stay 'nominations' — these
-- wins stand in for fn_finalize_award output until the awarding slice
-- ships. The recipient rows carry the award's prize_points: they are the
-- TEAM LEADERBOARD's source (award points only), while base_points stays 0
-- so the award card itself keeps showing no pts chip.
INSERT INTO recognition_history (kind, from_user_id, award_id, message, base_points, value_id, status, occurred_at)
SELECT 'award', v.nominator, v.award_id, v.message, 0, NULL, 'approved',
       now() - (v.age_days * interval '1 day')
FROM (VALUES
  ((SELECT id FROM users WHERE employee_code = 'E-L1'),
   (SELECT id FROM awards WHERE name = 'Pat on the Back'),
   'Won this quarter''s Pat on the Back for going above and beyond for customers.', 3),
  ((SELECT id FROM users WHERE employee_code = 'E-009'),
   (SELECT id FROM awards WHERE name = 'Super Squad'),
   'The whole squad shipped the release under the wire — team award, well earned.', 6)
) AS v(nominator, award_id, message, age_days)
WHERE NOT EXISTS (
  SELECT 1 FROM recognition_history WHERE kind = 'award' AND award_id = v.award_id);

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, u.id, a.prize_points, 'to'
FROM recognition_history rh
JOIN (VALUES
  ('Pat on the Back', ARRAY['E-ES']),
  ('Super Squad',     ARRAY['E-FT','E-AC','E-DN','E-AJ','E-GI'])
) AS v(aname, codes) ON rh.award_id = (SELECT a.id FROM awards a WHERE a.name = v.aname)
JOIN awards a ON a.id = rh.award_id
JOIN users u ON u.employee_code = ANY (v.codes)
WHERE rh.kind = 'award'
ON CONFLICT DO NOTHING;

-- ===== past lifetime wins: the TEAM LEADERBOARD's history =====
-- The board sums award points LIFETIME (all approved award rows, no time
-- window), not the wallet balance — peer cheers and welcome/anniversary
-- gift points never enter. The two wins above are this cycle's cards; the
-- rows below are older wins (the retired EoQ / Rising Star / Powerhouse
-- racks) so every person's lifetime total is distinct instead of a wall of
-- identical prizes. No feed_post for these — the feed only shows the
-- current win. Idempotent per (award, winner).
-- One history row per (award, winner) pair with the recipient attached to
-- exactly that row — the DO loop keeps the two inserts atomic per pair.
DO $$
DECLARE rec RECORD; v_rid uuid;
BEGIN
  FOR rec IN SELECT aname, code, message, age_days FROM (VALUES
    ('Rising Star', 'E-AC', 'Won Rising Star for a standout delivery run last year.', 300),
    ('Rising Star', 'E-ES', 'Rising Star — ran the year''s biggest UAT cycle without a slip.', 270),
    ('Rising Star', 'E-FT', 'Rising Star — the year''s cleanest sprint-completion record.', 320),
    ('Pat on the Back', 'E-GI', 'Pat on the Back for stepping in mid-release two seasons ago.', 250),
    ('Pat on the Back', 'E-FT', 'Pat on the Back — held the migration week together last year.', 280),
    ('Powerhouse Performer', 'E-GI', 'Powerhouse — relentless quarter close, top of the pod.', 330),
    ('Powerhouse Performer', 'E-L1', 'Powerhouse for keeping the client cutover on rails.', 220),
    ('Powerhouse Performer', 'E-PR', 'Powerhouse — owned the billing revamp end to end.', 190),
    ('Employee of the Quarter — Customer First', 'E-DN', 'EoQ Customer First — the quarter''s standout support story.', 260),
    ('Employee of the Quarter — Ownership', 'E-ES', 'EoQ Ownership — took the failing workstream and steadied it.', 360),
    ('Employee of the Quarter — Team Spirit', 'E-L1', 'EoQ Team Spirit for pulling the pods together at the offsite.', 160)
  ) AS t(aname, code, message, age_days)
  LOOP
    -- already a win for this (award, person)? then the pair exists; skip
    IF EXISTS (
      SELECT 1 FROM recognition_recipients rr
      JOIN recognition_history rh ON rh.id = rr.recognition_id
     WHERE rh.kind = 'award'
       AND rh.award_id = (SELECT id FROM awards WHERE name = rec.aname)
       AND rr.user_id = (SELECT id FROM users WHERE employee_code = rec.code)) THEN
      CONTINUE;
    END IF;
    INSERT INTO recognition_history (kind, from_user_id, award_id, message, base_points, value_id, status, occurred_at)
    VALUES ('award',
            (SELECT id FROM users WHERE employee_code = 'E-009'),
            (SELECT id FROM awards WHERE name = rec.aname),
            rec.message, 0, NULL, 'approved',
            now() - (rec.age_days * interval '1 day'))
    RETURNING id INTO v_rid;
    INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
    VALUES (v_rid,
            (SELECT id FROM users WHERE employee_code = rec.code),
            (SELECT prize_points FROM awards WHERE name = rec.aname), 'to');
  END LOOP;
END $$;

-- ===== prize payouts: the POINTS WALLET follows the same wins =====
-- The balance tile reads points_wallet.balance (GET /me/stats) — the live
-- wallet, current after any future redemptions debit it. Since the awarding
-- slice isn't wired to fn_finalize_award yet, the seed mirrors it: one
-- 'payout' journal per (award, winner), debit SYS_PRIZE / credit the
-- winner's wallet account, and the ledger row moves the balance. The pool
-- is funded once up front (150,000 covers the seeded wins plus headroom the
-- admin flow will need on a demo database). Idempotent per (award, winner).
DO $$
DECLARE w record; v_wallet uuid; v_account uuid; v_journal uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM journal_line l JOIN ledger_account a ON a.id = l.account_id
    WHERE a.code = 'SYS_PRIZE' AND l.direction = 'credit') THEN
    INSERT INTO journal_entry (kind, memo, created_by)
      VALUES ('grant', 'seed: fund prize pool', (SELECT id FROM users WHERE employee_code = 'E-009'))
      RETURNING id INTO v_journal;
    INSERT INTO journal_line (journal_id, account_id, direction, amount)
      SELECT v_journal, id, 'credit', 150000 FROM ledger_account WHERE code = 'SYS_PRIZE' LIMIT 1;
    INSERT INTO journal_line (journal_id, account_id, direction, amount)
      SELECT v_journal, id, 'debit', 150000 FROM ledger_account WHERE code = 'SYS_BUDGET_FUND' LIMIT 1;
  END IF;

  FOR w IN
    SELECT rr.user_id, rr.points, rh.award_id, a.name AS award_name
      FROM recognition_recipients rr
      JOIN recognition_history rh ON rh.id = rr.recognition_id
      JOIN awards a ON a.id = rh.award_id
     WHERE rh.kind = 'award' AND rh.status = 'approved' AND rr.kind = 'to' AND rr.points > 0
     ORDER BY rr.user_id
  LOOP
    IF EXISTS (SELECT 1 FROM ledger l
                JOIN journal_entry j ON j.id = l.journal_id
               WHERE l.user_id = w.user_id AND l.amount = w.points AND j.linked_award_id = w.award_id) THEN
      CONTINUE;
    END IF;
    SELECT pw.id INTO v_wallet FROM points_wallet pw WHERE pw.user_id = w.user_id;
    IF v_wallet IS NULL THEN
      INSERT INTO points_wallet (user_id) VALUES (w.user_id) RETURNING id INTO v_wallet;
    END IF;
    INSERT INTO ledger_account (code, kind, wallet_id)
      VALUES ('wallet:' || w.user_id::text, 'user_wallet', v_wallet)
      ON CONFLICT (code) DO UPDATE SET wallet_id = EXCLUDED.wallet_id
      RETURNING id INTO v_account;
    INSERT INTO journal_entry (kind, memo, linked_award_id, created_by)
      VALUES ('payout', 'award prize: ' || w.award_name, w.award_id,
              (SELECT id FROM users WHERE employee_code = 'E-009'))
      RETURNING id INTO v_journal;
    INSERT INTO journal_line (journal_id, account_id, direction, amount)
      SELECT v_journal, id, 'debit', w.points FROM ledger_account WHERE code = 'SYS_PRIZE' LIMIT 1;
    INSERT INTO journal_line (journal_id, account_id, direction, amount)
      VALUES (v_journal, v_account, 'credit', w.points);
    INSERT INTO ledger (journal_id, points_wallet_id, kind, amount, label, user_id)
      VALUES (v_journal, v_wallet, 'payout', w.points, 'award prize: ' || w.award_name, w.user_id);
  END LOOP;
END $$;

INSERT INTO feed_post (kind, entity_type, entity_id, actor_id, occurred_at, is_public, is_bu)
SELECT 'award', 'recognition', rh.id, rh.from_user_id, rh.occurred_at, true, false
FROM recognition_history rh
WHERE rh.kind = 'award'
ON CONFLICT DO NOTHING;

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
-- ===== composer demo: one praise template per EMIDS value (3 total) =====
-- Shapes follow the GET /values read-path: values carry art_json with a
-- 'urls' array; templates key by (value_id, name), is_active by default.
INSERT INTO recognition_templates (value_id, name, emoji, art_json, prefill)
SELECT e.id, v2.name, v2.emoji, v2.art, v2.prefill
FROM (VALUES
  ('impact_obsessed','Impact Obsessed','🎯','{"urls":["https://cdn.emids.test/templates/ownership-01.webp"]}'::jsonb,'Thank you for owning the outcome when…'),
  ('trusted_guides','Trusted Guides','🤝','{"urls":["https://cdn.emids.test/templates/customer-first-01.webp","https://cdn.emids.test/templates/customer-first-02.webp"]}'::jsonb,'Thank you for putting the customer at the centre of…'),
  ('inclusive_innovators','Inclusive Innovators','💡','{"urls":["https://cdn.emids.test/templates/innovation-01.webp"]}'::jsonb,'Thank you for finding a new way to…')
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
SELECT 'milestone', u.id, (SELECT id FROM emids_values WHERE key='impact_obsessed'),
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
SELECT 'praise', fu.id, (SELECT id FROM emids_values WHERE key='inclusive_innovators'),
       'Internal drafter — this moment stays private until the BU review signs off.',
       0, 'approved'::recognition_status, now(), 'feed-demo-hidden-01'
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

-- The old pending-approval demo (a 120-pt routed send) is retired: the
-- approval workflow is gone (0030) and Recognize is a zero-point send that
-- publishes directly to the feed.

-- ===== DH approval-lane demo: award nominations (0031) =====
-- The nominations the department head reviews: the dossier the /approvals
-- pages present (why-story, achievements, supporting docs) + one
-- decided row PER verdict so both pipeline ends are visible in the table
-- (the endorsed row sits at review_stage='admin' for the wired admin step;
-- the returned row carries the rejection reason the nominator reads).
-- All rows key on the awards_nom_uniq UNIQUE (award_id, nominee_id) — a
-- re-run adds nothing. Fresh nominations from the real submit fn land in
-- the same table with identically shaped columns, so seed and live data
-- are one dataset, never two.

INSERT INTO awards_nominations (award_id, nominee_id, nominator_id, story,
                                is_self_nomination, status, achievements,
                                supporting_docs, review_stage, decided_by,
                                decided_at, decision_note, created_at)
VALUES
  ((SELECT id FROM awards WHERE name = 'Pat on the Back')     , (SELECT id FROM users WHERE employee_code = 'E-KM'), (SELECT id FROM users WHERE employee_code = 'E-L1'),
   $story$Kiran rebuilt our claims-matching pipeline as an event-driven design and cut reconciliation lag from two days to fifteen minutes. He then open-sourced the matcher inside the org so two other pods adopted it within a month — the rare engineer whose innovation outlives his ticket.$story$,
   false, 'submitted'::nomination_status,
   '["Cut reconciliation lag 99% with the event-driven matcher","Matcher adopted by two other delivery pods inside a month","Filed 3 patents with the platform group this year"]'::jsonb,
   '[{"label":"Q3 pipeline report.pdf","url":"#innov-report"},{"label":"Matcher adoption metrics.xlsx","url":"#innov-metrics"}]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '30 hours'),
  ((SELECT id FROM awards WHERE name = 'Pat on the Back')     , (SELECT id FROM users WHERE employee_code = 'E-ZK'), (SELECT id FROM users WHERE employee_code = 'E-L1'),
   $story$Zoya prototyped and user-tested the new claims intake flow in record time; the usability score went from 68 to 94 and the support backlog shrank right down. Her hand-off docs set a new bar for the design org.$story$,
   false, 'submitted'::nomination_status,
   '["Usability score 68 → 94 on the claims intake redesign","Support backlog on intake tickets down 61%","Her hand-off template is now the design-org default"]'::jsonb,
   '[{"label":"Intake redesign case study.pdf","url":"#zoya-case"}]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '52 hours'),
  ((SELECT id FROM awards WHERE name = 'Powerhouse Performer'), (SELECT id FROM users WHERE employee_code = 'E-PR'), (SELECT id FROM users WHERE employee_code = 'E-HD'),
   $story$Priya carried the flaky pipeline migration through without a single rollback and wrote the retry harness that cut our flaky-suite count in half — as an individual contributor she is doing lead-level work.$story$,
   false, 'submitted'::nomination_status,
   '["Zero-rollback platform migration across 6 services","Retry harness cut the flaky test count 52%","Mentored two interns to first production deploys"]'::jsonb,
   '[{"label":"Migration retrospective.md","url":"#priya-retro"}]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '20 hours'),
  ((SELECT id FROM awards WHERE name = 'Powerhouse Performer'), (SELECT id FROM users WHERE employee_code = 'E-AJ'), (SELECT id FROM users WHERE employee_code = 'E-HD'),
   $story$Arjun closed every open security finding before the audit call and distilled the curl runbook down from 40 steps to 12 — new joiners now ramp on the runbook themselves.$story$,
   false, 'submitted'::nomination_status,
   '["Audit findings closed two weeks ahead of the deadline","Runbook compressed 40 → 12 steps, self-serve for joiners","On-call rotation stress measurably down since his shift design"]'::jsonb,
   '[]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '70 hours'),
  ((SELECT id FROM awards WHERE name = 'Stellar Squad')       , (SELECT id FROM users WHERE employee_code = 'E-TN'), (SELECT id FROM users WHERE employee_code = 'E-MP'),
   $story$Tara's coding-gym buddy hour has become the most-attended internal program, and people credit her with making help-seeking normal in the pod. The engagement survey names her twice as often as the next lead.$story$,
   false, 'submitted'::nomination_status,
   '["Coding-gym buddy hour: the most-attended internal program","Named in the engagement survey by peers across two BUs"]'::jsonb,
   '[{"label":"Survey verbatims (anonymized).docx","url":"#tara-survey"}]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '100 hours'),
  ((SELECT id FROM awards WHERE name = 'CEO Award')           , (SELECT id FROM users WHERE employee_code = 'E-MP'), (SELECT id FROM users WHERE employee_code = 'E-009'),
   $story$Meera piloted the sprint-board automation as a hack-week project in her own board before pitching it; three squads now refuse to work without it, and her one-page pitch deck sold the ops council in ten minutes.$story$,
   false, 'submitted'::nomination_status,
   '["Sprint-board automation now running on three squads","Hack-week experiment adopted by the ops council"]'::jsonb,
   '[{"label":"Automation pilot results.pdf","url":"#meera-pilot"}]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '120 hours'),
  ((SELECT id FROM awards WHERE name = 'CEO Award')           , (SELECT id FROM users WHERE employee_code = 'E-BR'), (SELECT id FROM users WHERE employee_code = 'E-009'),
   $story$Brooke kept the town-hall logistics humming while the venue changed twice in one week — every invite, rerun and recording landed without a single missed step, and half the org never knew anything had wobbled.$story$,
   false, 'submitted'::nomination_status,
   '["Town-hall logistics under two venue changes in a week"]'::jsonb,
   '[]'::jsonb,
   'dh'::text, NULL, NULL, NULL, now() - interval '140 hours'),
  -- decided sample #1: the APPROVED branch — endorsed by the DH, staged in
  -- the admin lane for the wired admin-decision step
  ((SELECT id FROM awards WHERE name = 'Powerhouse Performer'), (SELECT id FROM users WHERE employee_code = 'E-MS'), (SELECT id FROM users WHERE employee_code = 'E-HD'),
   $story$Meher kept the migration train running while half the pod was out — she picked up three services no one owned and shipped them without a single incident tick.$story$,
   false, 'endorsed'::nomination_status,
   '["Absorbed three ownerless services during the migration freeze","Zero incidents across the covered sprint window"]'::jsonb,
   '[]'::jsonb,
   'admin'::text, (SELECT id FROM users WHERE employee_code = 'E-HD'), now() - interval '40 hours', NULL, now() - interval '96 hours'),
  -- decided sample #2: the DECLINED branch — returned to the nominator with
  -- the reason the rejection screen requires
  ((SELECT id FROM awards WHERE name = 'Pat on the Back')     , (SELECT id FROM users WHERE employee_code = 'E-RH'), (SELECT id FROM users WHERE employee_code = 'E-L1'),
   $story$Rahul held the on-call pager through a brutal release week and turned every escalation into a documented runbook entry before the next one landed.$story$,
   false, 'returned'::nomination_status,
   '["Documented five escalation runbooks during release week"]'::jsonb,
   '[]'::jsonb,
   'done'::text, (SELECT id FROM users WHERE employee_code = 'E-L1'), now() - interval '10 hours',
   'The release-week hold was appreciated, but it stays inside normal on-call expectations — put the pager-heroics next to a shipped outcome next cycle.', now() - interval '5 days')
ON CONFLICT (award_id, nominee_id) DO NOTHING;

-- ===== DM/DH leadership lanes (0036) =====
-- The demo org maps onto the model: each team carries its DM (who raises the
-- nominations) and its DH (whose queue the nomination lands in) —
--   Mobile (dm Sam → dh Harish) · Platform (dm Sam → dh Harish)
--   Finance Ops (dm Gaurav → dh Lena)
-- Sam owns two teams (the multi-team DM), Harish sits over both his lanes,
-- Lena runs her own lane — and Meera stays a plain manager: the strict rule
-- ("only this team's DM nominates") is visible by trying her.
UPDATE teams t SET dm_id = u.id, dh_id = l.id
FROM (VALUES
  ('Mobile',      'E-L1', 'E-HD'),
  ('Platform',    'E-L1', 'E-HD'),
  ('Finance Ops', 'E-GX', 'E-L2')
) AS v(team, dm_code, dh_code)
JOIN users u ON u.employee_code = v.dm_code
JOIN users l ON l.employee_code = v.dh_code
WHERE t.name = v.team;

-- the lane holders read as their role from the login dropdown and every
-- dossier: titles carry the DM/DH vocabulary
UPDATE users SET title = 'Delivery Head (DH)' WHERE employee_code IN ('E-HD','E-L2')
  AND title NOT ILIKE 'Delivery Head%';
UPDATE users SET title = 'Delivery Manager (DM)' WHERE employee_code IN ('E-L1','E-GX')
  AND title NOT ILIKE 'Delivery Manager%';

-- the seeded nominations line up with their lanes: a nomination's nominator
-- is the nominee's team DM (admins stay the override). Keyed on the
-- (award_id, nominee_id) UNIQUE, so re-runs only fix what drifted.
UPDATE awards_nominations n SET nominator_id = u.id
FROM (VALUES
  ('Pat on the Back',      'E-ZK', 'E-GX'),   -- Zoya: Finance Ops → dm Gaurav
  ('Stellar Squad',        'E-TN', 'E-L1'),   -- Tara: Platform → dm Sam
  ('Powerhouse Performer', 'E-PR', 'E-L1'),   -- Priya: Platform → dm Sam
  ('Powerhouse Performer', 'E-AJ', 'E-L1'),   -- Arjun: Platform → dm Sam
  ('Powerhouse Performer', 'E-MS', 'E-L1')    -- Meher: Mobile → dm Sam
) AS v(aname, ncode, dm_code)
JOIN awards a  ON a.name = v.aname
JOIN users nu ON nu.employee_code = v.ncode
JOIN users u ON u.employee_code = v.dm_code
WHERE n.award_id = a.id AND n.nominee_id = nu.id
  AND n.nominator_id <> u.id;

-- the DM/DH model (0036): no member carries a 'lead' role anymore — the
-- team's DM/DH ownership lives on teams.dm_id/dh_id; retire stale lead rows
UPDATE team_members tm SET valid_to = now()::date
FROM users u
WHERE tm.user_id = u.id AND tm.valid_to IS NULL AND tm.role = 'lead'
  AND u.employee_code IN ('E-RH','E-L1','E-L2');

