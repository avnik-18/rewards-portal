-- fn_feed_posts at 0023: the published feed for a viewer, ranked bu > own >
-- team > related and then most recent first, with keyset pagination.
-- Every row of feed_post is written by the publication pipeline only after
-- the approval chain fully resolves, so presence in feed_post IS the "live on
-- the feed" fact; rows drop out of the feed only via is_public = false.
-- All tables are aliased (fp, rh, gv, ev, rrx, ru, fr, ...) and every column
-- reference qualified: the RETURNS TABLE out-names (recognition_id, tier,
-- occurred_at, kind, points, ...) would otherwise capture bare refs.
CREATE OR REPLACE FUNCTION fn_feed_posts(
  p_viewer uuid,
  p_limit integer,
  p_last_tier text DEFAULT NULL,
  p_last_at timestamptz DEFAULT NULL,
  p_last_id uuid DEFAULT NULL)
RETURNS TABLE (
  recognition_id uuid, tier text, occurred_at timestamptz,
  giver_id uuid, giver_name text, giver_avatar text,
  message text, points integer, value_label text, kind text, recipients jsonb)
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE
  view_roster(user_id) AS (
    SELECT tm.user_id
      FROM team_members tm
     WHERE tm.valid_to IS NULL
       AND tm.team_id IN (
             SELECT vtm.team_id
               FROM team_members vtm
              WHERE vtm.user_id = p_viewer
                AND vtm.valid_to IS NULL)
  ),
  org_subtree(user_id) AS (
    SELECT u.id
      FROM users u
     WHERE u.manager_id = p_viewer
       AND u.employment_status <> 'separated'
    UNION ALL
    SELECT u.id
      FROM users u
      JOIN org_subtree ost ON u.manager_id = ost.user_id
     WHERE u.employment_status <> 'separated'
  ),
  post_ranked AS (
    SELECT fp.id,
           fp.entity_id,
           fp.occurred_at,
           fp.actor_id,
           fp.is_bu,
           rh.message,
           rh.base_points,
           rh.value_id,
           rh.kind AS rec_kind,
           CASE
             WHEN fp.is_bu THEN 1
             WHEN fp.actor_id = p_viewer
               OR EXISTS (
                    SELECT 1
                      FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id = p_viewer
                       AND rrx.kind IN ('to', 'cc'))
             THEN 2
             WHEN fp.actor_id IN (SELECT user_id FROM view_roster)
               OR fp.actor_id IN (SELECT user_id FROM org_subtree)
               OR EXISTS (
                    SELECT 1
                      FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id IN (SELECT user_id FROM view_roster))
               OR EXISTS (
                    SELECT 1
                      FROM recognition_recipients rrx
                     WHERE rrx.recognition_id = fp.entity_id
                       AND rrx.user_id IN (SELECT user_id FROM org_subtree))
             THEN 3
             ELSE 4
           END AS tier_rank
      FROM feed_post fp
      INNER JOIN recognition_history rh ON rh.id = fp.entity_id
     WHERE fp.is_public
       AND fp.entity_type = 'recognition'
  )
  SELECT fr.entity_id,
         (CASE fr.tier_rank
            WHEN 1 THEN 'bu'
            WHEN 2 THEN 'own'
            WHEN 3 THEN 'team'
            ELSE 'related'
          END)::text,
         fr.occurred_at,
         fr.actor_id,
         gv.full_name,
         gv.avatar_url,
         fr.message,
         fr.base_points,
         ev.label,
         fr.rec_kind::text,
         COALESCE(agg.recipients, '[]'::jsonb)
    FROM post_ranked fr
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
   WHERE (p_last_tier IS NULL
          OR fr.tier_rank > (CASE p_last_tier
                               WHEN 'bu' THEN 1
                               WHEN 'own' THEN 2
                               WHEN 'team' THEN 3
                               WHEN 'related' THEN 4
                             END)
          OR (fr.tier_rank = (CASE p_last_tier
                                WHEN 'bu' THEN 1
                                WHEN 'own' THEN 2
                                WHEN 'team' THEN 3
                                WHEN 'related' THEN 4
                              END)
              AND fr.occurred_at < p_last_at)
          OR (fr.tier_rank = (CASE p_last_tier
                                WHEN 'bu' THEN 1
                                WHEN 'own' THEN 2
                                WHEN 'team' THEN 3
                                WHEN 'related' THEN 4
                              END)
              AND fr.occurred_at = p_last_at
              AND fr.entity_id < p_last_id))
   ORDER BY fr.tier_rank ASC, fr.occurred_at DESC, fr.entity_id DESC
   LIMIT p_limit;
END; $$ LANGUAGE plpgsql STABLE;
