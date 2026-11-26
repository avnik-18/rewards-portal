-- fn_admin_list_cycles at 0029: same signature as 0027, the payload grows —
-- the cycle carries the award-cycle timeline (nominations_close/voting_close/
-- results_on; cadence is NOT a cycle property — it lives on the awards) and
-- each award carries max_nominations_per_nominator plus the portal authoring
-- fields (cadence, description, photo_url, guidelines).
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
               'nominations_close', f.nominations_close,
               'voting_close', f.voting_close,
               'results_on', f.results_on,
               'is_current', CURRENT_DATE BETWEEN f.starts AND f.ends,
               'content', (SELECT to_jsonb(c) - ARRAY['period_id','updated_by','created_at','updated_at']
                             FROM awards_cycle_content c WHERE c.period_id = f.id),
               'awards', COALESCE((
                 SELECT jsonb_agg(jsonb_build_object(
                            'id', a.id,
                            'name', a.name,
                            'description', a.description,
                            'photo_url', a.photo_url,
                            'cadence', a.cadence,
                            'guidelines', a.guidelines,
                            'prize_points', a.prize_points,
                            'phase', a.phase,
                            'nominations_end', a.nominations_end,
                            'voting_end', a.voting_end,
                            'requires_jury', a.requires_jury,
                            'max_nominations_per_nominator', a.max_nominations_per_nominator)
                        ORDER BY a.name)
                   FROM awards a WHERE a.period_id = f.id), '[]'::jsonb))
           ORDER BY f.starts DESC)
      FROM fiscal_period f), '[]'::jsonb);
END; $$ LANGUAGE plpgsql;
