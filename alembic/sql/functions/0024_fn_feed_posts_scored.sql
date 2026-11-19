-- fn_feed_posts at 0024: the published feed for a viewer, scored per viewer
-- by relationship tier x recency decay (+ anniversary-today boost), instead of
-- the 0023 tier-bucket sort. Ordering is continuous: score DESC, then newest,
-- then id — three people with different teams/managers get different orders
-- from the same feed_post table, nothing is hidden (is_public still gates the
-- row set exactly as before).
--
-- score = tier_weight x decay + boost
--   tier_weight (strongest relationship between viewer and giver+recipients):
--       100  own (viewer is the giver or a to/cc recipient)
--       75   manager chain (their manager, manager's manager, their reports)
--       70   teammate in a team the viewer LEADS
--       60   teammate (shares an open team
--       35   same business unit (is_bu row OR same users.department)
--       15   rest of the org
--     Tiers are strongest-match, never additive (manager awarding me is 100
--     not 175); team overlap has a lead-kicker instead of stacking.
--   decay — hours_old counts from feed_post.occurred_at:
--       praise/award:  1 / (hours_old + 2)^0.6      fast fade
--       welcome:       1 / (hours_old + 48)^0.5
--       milestone:     1 / (hours_old + 72)^0.5
--     (hours_old + N keeps the curve finite at hour 0 and flattens its start).
--   boost: +25 for a milestone posted today — anniversaries top the feed for
--     the day, then decay slowly through the same curve.
--
-- Keyset cursor keys move from (tier, occurred_at, id) to continuous
-- (score, occurred_at, entity_id): the score replaces the tier as the first
-- sort key. The legacy `tier` text is still returned (own/team/bu/related) so
-- badge semantics survive; 75 and 60/70 both label 'team'.
-- Every table/column is aliased: the RETURNS TABLE out-names would otherwise
-- capture bare refs during RETURN QUERY.
CREATE OR REPLACE FUNCTION fn_feed_posts(
  p_viewer uuid,
  p_limit integer,
  p_last_score double precision DEFAULT NULL,
  p_last_at timestamptz DEFAULT NULL,
  p_last_id uuid DEFAULT NULL)
RETURNS TABLE (
  recognition_id uuid, tier text, score double precision, occurred_at timestamptz,
  giver_id uuid, giver_name text, giver_avatar text,
  message text, points integer, value_label text, kind text, recipients jsonb)
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  manager_chain(user_id) AS (
    SELECT u.manager_id FROM users u
     WHERE u.id = p_viewer AND u.manager_id IS NOT NULL
     UNION ALL
    SELECT u.manager_id FROM users u
      JOIN manager_chain mh ON mh.user_id = u.id
     WHERE u.manager_id IS NOT NULL
  ),
  org_subtree(user_id) AS (
    SELECT u.id FROM users u
     WHERE u.manager_id = p_viewer AND u.employment_status <> 'separated'
     UNION ALL
    SELECT u.id FROM users u
      JOIN org_subtree ost ON u.manager_id = ost.user_id
     WHERE u.employment_status <> 'separated'
  ),
  team_roster(user_id) AS (
    SELECT tm.user_id FROM team_members tm
     WHERE tm.valid_to IS NULL
       AND tm.team_id IN (
             SELECT vtm.team_id FROM team_members vtm
              WHERE vtm.user_id = p_viewer AND vtm.valid_to IS NULL)
  ),
  viewer_dept(dept) AS (
    SELECT department FROM users WHERE id = p_viewer
  ),
  post_scored AS (
    SELECT fp.id,
           fp.entity_id,
           fp.occurred_at,
           fp.actor_id,
           rh.message,
           rh.base_points,
           rh.value_id,
           rh.kind AS rec_kind,
           extract(epoch FROM (now() - fp.occurred_at)) / 3600.0 AS age_hours,
           CASE
             WHEN fp.actor_id = p_viewer
               OR EXISTS (
                    SELECT 1 FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id = p_viewer AND rrx.kind IN ('to', 'cc'))
             THEN 100.0
             WHEN fp.actor_id IN (SELECT user_id FROM manager_chain)
               OR fp.actor_id IN (SELECT user_id FROM org_subtree)
               OR EXISTS (
                    SELECT 1 FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id IN (SELECT user_id FROM manager_chain))
               OR EXISTS (
                    SELECT 1 FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id IN (SELECT user_id FROM org_subtree))
             THEN 75.0
             WHEN fp.actor_id IN (SELECT user_id FROM team_roster)
               OR EXISTS (
                    SELECT 1 FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id IN (SELECT user_id FROM team_roster))
             THEN CASE WHEN EXISTS (
                          SELECT 1 FROM team_members lx
                            JOIN team_members ly ON ly.team_id = lx.team_id
                           WHERE lx.user_id = p_viewer
                             AND lx.role = 'lead' AND lx.valid_to IS NULL
                             AND ly.valid_to IS NULL
                             AND (ly.user_id = fp.actor_id
                                  OR ly.user_id IN (
                                       SELECT rrx.user_id FROM recognition_recipients rrx
                                        WHERE rrx.recognition_id = fp.entity_id)))
                       THEN 70.0 ELSE 60.0 END
             WHEN fp.is_bu
               OR ( (SELECT dept FROM viewer_dept) IS NOT NULL
                    AND (SELECT dept FROM viewer_dept) IN (
                      SELECT ux.department FROM users ux WHERE ux.id = fp.actor_id
                      UNION ALL
                      SELECT ux.department
                        FROM recognition_recipients rrx
                        JOIN users ux ON ux.id = rrx.user_id
                        WHERE rrx.recognition_id = fp.entity_id) )
             THEN 35.0
             ELSE 15.0
           END AS tier_weight,
           CASE rh.kind
                WHEN 'milestone' THEN power(1.0 / (extract(epoch FROM (now() - fp.occurred_at)) / 3600.0 + 72), 0.5)
                WHEN 'welcome'   THEN power(1.0 / (extract(epoch FROM (now() - fp.occurred_at)) / 3600.0 + 48), 0.5)
                ELSE                  power(1.0 / (extract(epoch FROM (now() - fp.occurred_at)) / 3600.0 + 2),  0.6)
           END AS decay
      FROM feed_post fp
      INNER JOIN recognition_history rh ON rh.id = fp.entity_id
     WHERE fp.is_public AND fp.entity_type = 'recognition'
  ),
  post_final AS (
    SELECT fr.*,
           (fr.tier_weight * fr.decay
           + CASE WHEN fr.rec_kind = 'milestone' AND fr.occurred_at::date = now()::date
                  THEN 25.0 ELSE 0.0 END)::double precision AS final_score
      FROM post_scored fr
  )
  SELECT fr.entity_id,
         (CASE
            WHEN fr.tier_weight >= 100.0 THEN 'own'
            WHEN fr.tier_weight >= 60.0  THEN 'team'
            WHEN fr.tier_weight >= 35.0  THEN 'bu'
            ELSE 'related'
          END)::text,
         fr.final_score,
         fr.occurred_at,
         fr.actor_id,
         gv.full_name,
         gv.avatar_url,
         fr.message,
         fr.base_points,
         ev.label,
         fr.rec_kind::text,
         COALESCE(agg.recipients, '[]'::jsonb)
    FROM post_final fr
    LEFT JOIN users gv ON gv.id = fr.actor_id
    LEFT JOIN emids_values ev ON ev.id = fr.value_id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'user_id', ru.id,
                 'name', ru.full_name,
                 'points', rrx.points,
                 'kind', rrx.kind::text)
               ORDER BY rrx.kind, ru.full_name) AS recipients
        FROM recognition_recipients rrx
        LEFT JOIN users ru ON ru.id = rrx.user_id
       WHERE rrx.recognition_id = fr.entity_id
    ) agg ON TRUE
   WHERE (p_last_score IS NULL
          OR fr.final_score < p_last_score
          OR (fr.final_score = p_last_score
              AND (fr.occurred_at < p_last_at
                   OR (fr.occurred_at = p_last_at
                       AND fr.entity_id < p_last_id))))
   ORDER BY fr.final_score DESC, fr.occurred_at DESC, fr.entity_id DESC
   LIMIT p_limit;
END; $$ LANGUAGE plpgsql STABLE;
