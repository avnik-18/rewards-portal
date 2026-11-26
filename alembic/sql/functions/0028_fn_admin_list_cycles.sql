-- fn_admin_list_cycles — the admin Cycles tab read.
-- Every fiscal period (a "cycle" IS the fiscal period — awards are its
-- categories) with its tile-content row and its awards. Read-only: persona
-- gated, no audit (writes only, per the 0019 audit convention).
CREATE OR REPLACE FUNCTION fn_admin_list_cycles(p_actor uuid)
RETURNS jsonb AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM role_assignment
                  WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(
             jsonb_build_object(
               'id', f.id,
               'name', f.name,
               'starts', f.starts,
               'ends', f.ends,
               'is_current', CURRENT_DATE BETWEEN f.starts AND f.ends,
               'content', (SELECT to_jsonb(c) - ARRAY['period_id','updated_by','created_at','updated_at']
                             FROM awards_cycle_content c WHERE c.period_id = f.id),
               'awards', COALESCE((
                 SELECT jsonb_agg(jsonb_build_object(
                            'id', a.id,
                            'name', a.name,
                            'prize_points', a.prize_points,
                            'phase', a.phase,
                            'nominations_end', a.nominations_end,
                            'voting_end', a.voting_end)
                        ORDER BY a.name)
                   FROM awards a WHERE a.period_id = f.id), '[]'::jsonb))
           ORDER BY f.starts DESC)
      FROM fiscal_period f), '[]'::jsonb);
END; $$ LANGUAGE plpgsql;
