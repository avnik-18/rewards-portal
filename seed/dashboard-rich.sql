-- ranking demo — run AFTER seed/demo.sql on the same database (idempotent).
-- Shows the 0024 score ordering with the agreed feed shape: ONLY recognized
-- (praise) posts plus 2-3 welcome posts stay public — milestone rows from
-- demo.sql are unpublished here (the ranker keeps milestone support for the
-- day milestone_feed is switched on).
--
-- Ages are RE-STAMPED on re-run: every listed source_ref gets its occurred_at
-- refreshed on both recognition_history and feed_post, so a demo db is always
-- "fresh".
--
-- Rows (viewer = the demo default E-PR Priya Rao, employee: Platform team,
-- dept Engineering, manager Sam ← Lena ← Arun):
--   rank-own-fresh/own-stale   own tier (100) at 3h vs 2d
--   rank-chain-fresh/stale     manager chain (75) at 12h vs 1d
--   rank-team-fresh/stale      lead-teammate posts (70) at 6h vs 4d
--   rank-bu-welcome/+2/+3      the 2-3 welcome posts (teammate givers, fresh)
--   rank-related-fresh/stale   unrelated-org posts (15) fresh vs 7d
-- (feed-demo-BU-01 from demo.sql is the is_bu milestone TODAY — the +25 face)
--
-- Existing demo.sql rows get restamped ages so both layers read as a real week:
--   leaderboard-demo-A-02 6h   A-01 12h   B-01 1d   B-02 3d   B-03 7d   C-01 2d

-- ===== bigger org: more users, leaders included (managers, DM, DH, PM) =====
-- Structure: Lena (Delivery Director) ▸ new Delivery Manager Gaurav + new
-- Department Head Harish; Harish ▸ Project Manager Meera ▸ two engineers;
-- Gaurav ▸ two delivery analysts; Harish ▸ one engineer. Harvested joiners
-- also give the 3 welcome posts real "new joiner" faces. Allowances top up
-- via fn_allowance_seed (it fills only missing rows), so the new leaders can
-- actually spend points.
INSERT INTO users (employee_code, email, full_name, title, department) VALUES
  ('E-GX','gaurav@emids.test','Gaurav Xavier','Delivery Manager','Delivery'),
  ('E-HD','harish@emids.test','Harish Dayal','Department Head','Engineering'),
  ('E-MP','meera@emids.test','Meera Pillai','Project Manager','Engineering'),
  ('E-VS','vikram@emids.test','Vikram Shetty','Engineer','Engineering'),
  ('E-TN','tara@emids.test','Tara Nair','Engineer','Engineering'),
  ('E-JP','jatin@emids.test','Jatin Pandya','Engineer','Engineering'),
  ('E-MS','meher@emids.test','Meher Sahni','Engineer','Engineering'),
  ('E-AC','aarav@emids.test','Aarav Chowdhary','Analyst','Delivery'),
  ('E-ZK','zoya@emids.test','Zoya Khan','Analyst','Delivery')
ON CONFLICT (employee_code) DO NOTHING;

UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-L2')
  WHERE employee_code IN ('E-GX','E-HD');
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-HD')
  WHERE employee_code='E-MP';
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-MP')
  WHERE employee_code IN ('E-VS','E-TN','E-JP');
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-HD')
  WHERE employee_code='E-MS';
UPDATE users SET manager_id = (SELECT id FROM users WHERE employee_code='E-GX')
  WHERE employee_code IN ('E-AC','E-ZK');

SELECT fn_allowance_seed(f.id)
  FROM fiscal_period f
 WHERE now()::date BETWEEN f.starts AND f.ends;

-- the joiners join the existing teams as members (leads stay put)
INSERT INTO team_members (team_id, user_id, role)
SELECT t.id, u.id, 'member'::team_member_role
FROM (VALUES
  ('Platform','E-VS'), ('Platform','E-TN'),
  ('Mobile','E-JP'), ('Mobile','E-MS'),
  ('Finance Ops','E-AC'), ('Finance Ops','E-ZK')
) AS v(team_name, employee_code)
JOIN teams t  ON t.name = v.team_name
JOIN users u  ON u.employee_code = v.employee_code
WHERE NOT EXISTS (
  SELECT 1 FROM team_members m
   WHERE m.team_id = t.id AND m.user_id = u.id AND m.valid_to IS NULL);

-- leader posts (points travel with leaders) + peer cheers (0 pts, employees)
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT v.kind::recognition_kind, u.id, (SELECT id FROM emids_values WHERE key = v.val),
       v.msg, v.base, 'approved'::recognition_status, now(), v.ref
FROM (VALUES
  ('praise','E-HD','ownership','Vikram carried the platform cut-over without a single roll-back.',0,'rank-dh-fresh'),
  ('praise','E-MP','innovation','Tara rewrote the sprint board automation the team now refuses to lose.',0,'rank-pm-fresh'),
  ('praise','E-GX','customer_first','Aarav owned the client war-room call end to end.',0,'rank-dm-stale'),
  ('praise','E-HD','winning_mindset','Meher kept the release checklist immaculate for two quarters.',0,'rank-dh-stale'),
  ('praise','E-TN','collaboration','Jatin ran the coding-gym buddy hours for the whole mobile squad.',0,'rank-cheer-fresh'),
  ('praise','E-ZK','ownership','Zoya picked up Aarav''s oncall hand-off without blinking.',0,'rank-cheer-mid'),
  ('praise','E-AC','winning_mindset','Meher documented the whole API surface over one weekend.',0,'rank-cheer-stale')
) AS v(kind, code, val, msg, base, ref)
JOIN users u ON u.employee_code = v.code
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, ru.id, rh.base_points, 'to'
FROM recognition_history rh
JOIN (VALUES
  ('rank-dh-fresh','E-VS'), ('rank-pm-fresh','E-TN'),
  ('rank-dm-stale','E-AC'), ('rank-dh-stale','E-MS'),
  ('rank-cheer-fresh','E-JP'), ('rank-cheer-mid','E-VS'),
  ('rank-cheer-stale','E-MS')
) AS v(ref, rec_code)
  ON v.ref = rh.source_ref
JOIN users ru ON ru.employee_code = v.rec_code
WHERE NOT EXISTS (
  SELECT 1 FROM recognition_recipients rr WHERE rr.recognition_id = rh.id);

INSERT INTO feed_post (kind, entity_type, entity_id, is_public, actor_id, occurred_at, is_bu)
SELECT 'recognition', 'recognition', rh.id, true, rh.from_user_id, rh.occurred_at, false
  FROM recognition_history rh
 WHERE rh.source_ref LIKE 'rank-%' AND rh.status = 'approved'
 ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- one post per original tier x freshness band
INSERT INTO recognition_history (kind, from_user_id, value_id, message, base_points, status, occurred_at, source_ref)
SELECT v.kind::recognition_kind, u.id, (SELECT id FROM emids_values WHERE key = v.val),
       v.msg, v.base, 'approved'::recognition_status, now(), v.ref
FROM (VALUES
  ('praise','E-009','ownership','Rahul turned the client escalations around in one sprint.',0,'rank-own-fresh'),
  ('praise','E-L2','customer_first','Rahul fielded the delivery demo himself while the squad was out.',0,'rank-own-stale'),
  ('praise','E-L1','collaboration','Erica kept the flaky migration honest — no shortcuts on rollback tests.',0,'rank-chain-fresh'),
  ('praise','E-L2','ownership','Arjun closed every open security finding before the audit call.',0,'rank-chain-stale'),
  ('praise','E-AJ','innovation','Priya scripted the retry harness that cut our flaky-suite count in half.',0,'rank-team-fresh'),
  ('praise','E-PR','collaboration','Gautam picked up the pairing sessions nobody wanted on their plate.',0,'rank-team-stale'),
  ('welcome','E-FT','collaboration','Welcome Divya — joining the Mobile squad this week. Say hi!',0,'rank-bu-welcome'),
  ('milestone','E-L2','winning_mindset','Happy 5-year anniversary, Rahul — half a decade of shipping.',0,'rank-mile-own-4d'),
  ('praise','E-009','customer_first','Hema straightened out the quarterly reconciliation report.',0,'rank-related-fresh'),
  ('praise','E-HK','collaboration','Ivan rebuilt the chargeback workbook from scratch.',0,'rank-related-stale'),
  ('welcome','E-AJ','collaboration','Welcome Kiran — joining the Platform crew on the flaky-suite fix!',0,'rank-welcome-2'),
  ('welcome','E-L2','ownership','Welcome Ivan to the delivery floor — say hi when you pass by.',0,'rank-welcome-3')
) AS v(kind, code, val, msg, base, ref)
JOIN users u ON u.employee_code = v.code
ON CONFLICT (kind, source_ref) DO NOTHING;

INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
SELECT rh.id, ru.id, v.pts, 'to'
FROM recognition_history rh
JOIN (VALUES
  ('rank-own-fresh','E-PR',0), ('rank-own-stale','E-PR',0),
  ('rank-chain-fresh','E-ES',0), ('rank-chain-stale','E-AJ',0),
  ('rank-team-fresh','E-PR',0), ('rank-team-stale','E-GI',0),
  ('rank-bu-welcome','E-DN',0), ('rank-mile-own-4d','E-PR',0),
  ('rank-related-fresh','E-HK',0), ('rank-related-stale','E-IC',0),
  ('rank-welcome-2','E-KM',0), ('rank-welcome-3','E-IC',0)
) AS v(ref_code, rec_code, pts)
  ON v.ref_code = rh.source_ref
JOIN users ru ON ru.employee_code = v.rec_code
WHERE NOT EXISTS (
  SELECT 1 FROM recognition_recipients rr WHERE rr.recognition_id = rh.id);

INSERT INTO feed_post (kind, entity_type, entity_id, is_public, actor_id, occurred_at, is_bu)
SELECT 'recognition', 'recognition', rh.id, true, rh.from_user_id, rh.occurred_at, false
  FROM recognition_history rh
 WHERE rh.source_ref LIKE 'rank-%' AND rh.status = 'approved'
 ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- feed shape: only recognized (praise) + welcome posts stay public —
-- milestone rows (incl. demo.sql's is_bu town-hall post) never surface
UPDATE feed_post fp SET is_public = false
FROM recognition_history rh
WHERE fp.entity_type = 'recognition' AND fp.entity_id = rh.id
  AND rh.kind = 'milestone';

-- ===== leader-only points: the SEMANTIC rule as data =====
-- Point-based recognitions come from leaders only (personas: managers like
-- Sam/Lena, DH/DM/PM, admins); employee-to-employee posts are 0-point. The
-- seeded data tortures that: welcome posts drop to 0 points, and the
-- praise rows whose giver was an employee get repointed to the matching
-- leader (Platform lead Rahul, Finance head Arun). The feed's giver name
-- reads feed_post.actor_id, so the repoint mirrors across to it too.
UPDATE recognition_recipients rr SET points = 0
FROM recognition_history rh
WHERE rr.recognition_id = rh.id AND rh.kind = 'welcome' AND rr.points <> 0;

UPDATE recognition_history SET base_points = 0
WHERE kind = 'welcome' AND base_points <> 0;

UPDATE recognition_history rh
SET from_user_id = (SELECT id FROM users WHERE employee_code = v.leader)
FROM (VALUES
  ('rank-team-fresh','E-RH'),      -- Platform lead Rahul, not Arjun
  ('rank-team-stale','E-RH'),      -- ... not Priya either
  ('rank-related-stale','E-L3'),   -- Finance head Arun, not Hema
  ('leaderboard-demo-A-02','E-RH'),-- ... not Arjun
  ('feed-demo-hidden-01','E-RH')   -- unpublish demo row: private, still consistent
) AS v(ref, leader)
WHERE rh.source_ref = v.ref;

UPDATE feed_post fp SET actor_id = rh.from_user_id
FROM recognition_history rh
WHERE fp.entity_type = 'recognition' AND fp.entity_id = rh.id
  AND fp.actor_id <> rh.from_user_id;

-- ===== age restamping: both layers, every listed post =====
UPDATE recognition_history SET occurred_at = now() - make_interval(hours => v.hours)
FROM (VALUES
  ('rank-own-fresh',3),      ('rank-own-stale',48),
  ('rank-chain-fresh',12),   ('rank-chain-stale',24),
  ('rank-team-fresh',6),     ('rank-team-stale',96),
  ('rank-bu-welcome',2),     ('rank-mile-own-4d',96),
  ('rank-related-fresh',5),  ('rank-related-stale',168),
  ('rank-welcome-2',20),     ('rank-welcome-3',30),
  ('rank-dh-fresh',8),       ('rank-pm-fresh',30),
  ('rank-dm-stale',36),      ('rank-dh-stale',50),
  ('rank-cheer-fresh',1),    ('rank-cheer-mid',26),
  ('rank-cheer-stale',60),
  ('leaderboard-demo-A-01',12), ('leaderboard-demo-A-02',6),
  ('leaderboard-demo-B-01',24), ('leaderboard-demo-B-02',72),
  ('leaderboard-demo-B-03',168), ('leaderboard-demo-C-01',48),
  ('feed-demo-BU-01',2), ('feed-demo-hidden-01',40)
) AS v(ref, hours)
WHERE recognition_history.source_ref = v.ref AND v.hours IS NOT NULL;

UPDATE feed_post fp SET occurred_at = rh.occurred_at
FROM recognition_history rh
WHERE fp.entity_type = 'recognition'
  AND rh.id = fp.entity_id
  AND rh.source_ref IN (
    'rank-own-fresh','rank-own-stale','rank-chain-fresh','rank-chain-stale',
    'rank-team-fresh','rank-team-stale','rank-bu-welcome','rank-mile-own-4d',
    'rank-related-fresh','rank-related-stale','rank-welcome-2','rank-welcome-3',
    'rank-dh-fresh','rank-pm-fresh','rank-dm-stale','rank-dh-stale',
    'rank-cheer-fresh','rank-cheer-mid','rank-cheer-stale',
    'leaderboard-demo-A-01','leaderboard-demo-A-02','leaderboard-demo-B-01',
    'leaderboard-demo-B-02','leaderboard-demo-B-03','leaderboard-demo-C-01',
    'feed-demo-BU-01','feed-demo-hidden-01');

-- ----------------------------------------------------------------
-- Milestone dates for the upcoming-milestones rail (/celebrations):
-- birthdays (birth_date) and work anniversaries (joined_on). Offsets are
-- RE-STAMPED relative to each run, so the rail always has upcoming events;
-- the fixed year counts keep labels reading like real people ("5-year").
-- ----------------------------------------------------------------
UPDATE users SET birth_date = ((CURRENT_DATE + n.bday) - interval '29 years')::date,
                 joined_on  = ((CURRENT_DATE + n.join_off) - interval '4 years')::date
FROM (VALUES
  ('E-PR', 3, 12), ('E-AJ', 20, 5),  ('E-BR', 1, 10), ('E-DN', 8, 18),
  ('E-ES', 15, 22), ('E-FT', 27, 2), ('E-GI', 22, 16), ('E-KM', 26, 10),
  ('E-RH', 0, 9),   ('E-L1', 11, 25), ('E-L2', 4, 21),  ('E-L3', 7, 3),
  ('E-GX', 13, 16), ('E-HD', 2, 19),  ('E-MP', 6, 14),  ('E-009', 10, 1),
  ('E-AC', 17, 6),  ('E-ZK', 9, 23),  ('E-VS', 18, 4),  ('E-TN', 0, 8),
  ('E-JP', 12, 2),  ('E-MS', 21, 7),  ('E-HK', 14, 11), ('E-IC', 24, 5),
  ('E-JS', 19, 15)
) AS n(code, bday, join_off)
WHERE users.employee_code = n.code;

UPDATE users SET birth_date = ((CURRENT_DATE + n.bday) - interval '31 years')::date,
                 joined_on  = ((CURRENT_DATE + n.join_off) - interval '5 years')::date
FROM (VALUES
  ('E-BR', 1, 10), ('E-FT', 27, 2), ('E-RH', 0, 9), ('E-AC', 17, 6),
  ('E-VS', 18, 4), ('E-IC', 24, 5)
) AS n(code, bday, join_off)
WHERE users.employee_code = n.code;

UPDATE users SET birth_date = ((CURRENT_DATE + n.bday) - interval '33 years')::date,
                 joined_on  = ((CURRENT_DATE + n.join_off) - interval '6 years')::date
FROM (VALUES
  ('E-AJ', 20, 5), ('E-L1', 11, 25), ('E-GX', 13, 16), ('E-IC', 24, 5),
  ('E-009', 10, 1)
) AS n(code, bday, join_off)
WHERE users.employee_code = n.code;

UPDATE users SET birth_date = ((CURRENT_DATE + n.bday) - interval '30 years')::date,
                 joined_on  = ((CURRENT_DATE + n.join_off) - interval '7 years')::date
FROM (VALUES
  ('E-DN', 8, 18), ('E-ES', 15, 22), ('E-GI', 22, 16), ('E-JS', 19, 15),
  ('E-TN', 0, 8), ('E-HK', 14, 11)
) AS n(code, bday, join_off)
WHERE users.employee_code = n.code;

-- ----------------------------------------------------------------
-- Admin-posted org-wide events (festivals, town halls) — they surface in
-- the Upcoming events rail as kind='event'. Re-stamped relative to each
-- run and posted by the People-track admin (E-009).
-- ----------------------------------------------------------------
DELETE FROM admin_event
WHERE title IN ('Diwali celebration','Winter town hall','Annual awards night');

INSERT INTO admin_event (title, detail, event_at, created_by)
SELECT v.title, v.detail, CURRENT_DATE + v.in_days, (SELECT id FROM users WHERE employee_code = 'E-009')
FROM (VALUES
  ('Diwali celebration',  'Lights and sweets in the atrium — dress colorfully.', 6),
  ('Winter town hall',    'Q4 results, 2027 roadmap, and the service awards.',   14),
  ('Annual awards night', 'The big night — EoQ winners announced live.',         27)
) AS v(title, detail, in_days);
