-- fn_feed_posts at 0024: same contract as 0023 (tiered bu > own > team >
-- related, most recent first, keyset pagination) with a restructured plan.
-- Instead of ranking every public post per row (correlated EXISTS cascade fed
-- through a global sort), each tier is its own candidate branch: cursor-pruned
-- at the top, walked in its own order, capped at p_limit; the page is the first
-- p_limit rows across the four capped branches. own_ids / circle_ids are built
-- once and hash-joined / anti-joined instead of re-probed per row, and the
-- outer SELECT re-sorts the page (joins after the page CTE otherwise
-- reorder the delivered rows).
-- recognition_history / users / emids_values / recipients join only the final
-- page rows. The cursor is validated here (partial or unknown tier raises
-- 22023) — this fn is the last line of defense behind the API's 422. The
-- org_subtree recursion uses UNION so a corrupted manager cycle terminates.
-- All tables aliased and columns qualified as in 0023: the RETURNS TABLE
-- out-names would otherwise capture bare refs. Downgrade restores 0023.
CREATE OR REPLACE FUNCTION fn_feed_posts(
  p_viewer uuid,
  p_limit integer,
  p_last_tier text        DEFAULT NULL,
  p_last_at   timestamptz DEFAULT NULL,
  p_last_id   uuid        DEFAULT NULL)
RETURNS TABLE (
  recognition_id uuid, tier text, occurred_at timestamptz,
  giver_id uuid, giver_name text, giver_avatar text,
  message text, points integer, value_label text, kind text, recipients jsonb)
AS $$
DECLARE
  v_last_rank integer;   -- NULL = first page
BEGIN
  -- cursor validation: last line of defense behind the API
  IF (p_last_tier IS NULL) <> (p_last_at IS NULL)
     OR (p_last_tier IS NULL) <> (p_last_id IS NULL) THEN
    RAISE EXCEPTION 'partial cursor' USING ERRCODE = '22023';
  END IF;

  IF p_last_tier IS NOT NULL THEN
    v_last_rank := CASE p_last_tier
      WHEN 'bu' THEN 1 WHEN 'own' THEN 2
      WHEN 'team' THEN 3 WHEN 'related' THEN 4 END;
    IF v_last_rank IS NULL THEN
      RAISE EXCEPTION 'invalid cursor tier: %', p_last_tier USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN QUERY
  WITH RECURSIVE
  view_roster(user_id) AS (
    SELECT tm.user_id FROM team_members tm
     WHERE tm.valid_to IS NULL
       AND tm.team_id IN (SELECT vtm.team_id FROM team_members vtm
                           WHERE vtm.user_id = p_viewer AND vtm.valid_to IS NULL)
  ),
  org_subtree(user_id) AS (
    SELECT u.id FROM users u
     WHERE u.manager_id = p_viewer AND u.employment_status <> 'separated'
    UNION                                  -- cycle-safe
    SELECT u.id FROM users u
      JOIN org_subtree ost ON u.manager_id = ost.user_id
     WHERE u.employment_status <> 'separated'
  ),
  circle AS MATERIALIZED (
    SELECT user_id FROM view_roster
    UNION
    SELECT user_id FROM org_subtree
  ),
  -- Post ids that make a post "own" / "team" for this viewer, built once.
  -- Materialized CTEs are lazy: never read if every branch using them is pruned.
  own_ids AS MATERIALIZED (
    SELECT fp.entity_id
      FROM feed_post fp
     WHERE fp.is_public AND fp.entity_type = 'recognition'
       AND fp.actor_id = p_viewer
    UNION
    SELECT rrx.recognition_id
      FROM recognition_recipients rrx
     WHERE rrx.user_id = p_viewer AND rrx.kind IN ('to', 'cc')
  ),
  circle_ids AS MATERIALIZED (
    SELECT fp.entity_id
      FROM feed_post fp
      JOIN circle c ON c.user_id = fp.actor_id
     WHERE fp.is_public AND fp.entity_type = 'recognition'
    UNION
    SELECT rrx.recognition_id
      FROM recognition_recipients rrx
      JOIN circle c ON c.user_id = rrx.user_id
  ),
  -- One branch per tier. Each prunes itself against the cursor, walks its own
  -- order, and stops at p_limit. Same-direction (DESC, DESC) columns, so a
  -- row-value comparison is valid within a tier.
  cand AS (
    (SELECT 1 AS tier_rank, fp.entity_id, fp.occurred_at, fp.actor_id
       FROM feed_post fp
      WHERE fp.is_public AND fp.entity_type = 'recognition'
        AND fp.is_bu
        AND (v_last_rank IS NULL OR v_last_rank < 1
             OR (v_last_rank = 1
                 AND (fp.occurred_at, fp.entity_id) < (p_last_at, p_last_id)))
      ORDER BY fp.occurred_at DESC, fp.entity_id DESC
      LIMIT p_limit)
    UNION ALL
    (SELECT 2, fp.entity_id, fp.occurred_at, fp.actor_id
       FROM feed_post fp
       JOIN own_ids o ON o.entity_id = fp.entity_id
      WHERE fp.is_public AND fp.entity_type = 'recognition'
        AND fp.is_bu IS NOT TRUE
        AND (v_last_rank IS NULL OR v_last_rank < 2
             OR (v_last_rank = 2
                 AND (fp.occurred_at, fp.entity_id) < (p_last_at, p_last_id)))
      ORDER BY fp.occurred_at DESC, fp.entity_id DESC
      LIMIT p_limit)
    UNION ALL
    (SELECT 3, fp.entity_id, fp.occurred_at, fp.actor_id
       FROM feed_post fp
       JOIN circle_ids ci ON ci.entity_id = fp.entity_id
      WHERE fp.is_public AND fp.entity_type = 'recognition'
        AND fp.is_bu IS NOT TRUE
        AND NOT EXISTS (SELECT 1 FROM own_ids o WHERE o.entity_id = fp.entity_id)
        AND (v_last_rank IS NULL OR v_last_rank < 3
             OR (v_last_rank = 3
                 AND (fp.occurred_at, fp.entity_id) < (p_last_at, p_last_id)))
      ORDER BY fp.occurred_at DESC, fp.entity_id DESC
      LIMIT p_limit)
    UNION ALL
    (SELECT 4, fp.entity_id, fp.occurred_at, fp.actor_id
       FROM feed_post fp
      WHERE fp.is_public AND fp.entity_type = 'recognition'
        AND fp.is_bu IS NOT TRUE
        AND NOT EXISTS (SELECT 1 FROM own_ids o WHERE o.entity_id = fp.entity_id)
        AND NOT EXISTS (SELECT 1 FROM circle_ids ci WHERE ci.entity_id = fp.entity_id)
        AND (v_last_rank IS NULL OR v_last_rank < 4
             OR (v_last_rank = 4
                 AND (fp.occurred_at, fp.entity_id) < (p_last_at, p_last_id)))
      ORDER BY fp.occurred_at DESC, fp.entity_id DESC
      LIMIT p_limit)
  ),
  page AS (                                  -- at most 4 * p_limit rows in
    SELECT c.*
      FROM cand c
     ORDER BY c.tier_rank, c.occurred_at DESC, c.entity_id DESC
     LIMIT p_limit
  )
  SELECT pg.entity_id,
         (CASE pg.tier_rank WHEN 1 THEN 'bu' WHEN 2 THEN 'own'
                            WHEN 3 THEN 'team' ELSE 'related' END)::text,
         pg.occurred_at,
         pg.actor_id,
         gv.full_name,
         gv.avatar_url,
         rh.message,
         rh.base_points,
         ev.label,
         rh.kind::text,
         COALESCE(agg.recipients, '[]'::jsonb)
    FROM page pg
    JOIN recognition_history rh ON rh.id = pg.entity_id
    LEFT JOIN users gv ON gv.id = pg.actor_id
    LEFT JOIN emids_values ev ON ev.id = rh.value_id
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
       WHERE rrx.recognition_id = pg.entity_id
    ) agg ON TRUE
   ORDER BY pg.tier_rank, pg.occurred_at DESC, pg.entity_id DESC
  ;
END; $$ LANGUAGE plpgsql STABLE;
