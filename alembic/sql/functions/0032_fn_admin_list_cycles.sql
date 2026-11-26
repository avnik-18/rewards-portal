-- fn_admin_list_cycles at 0032: same signature/rules as 0029's body, the
-- award payload grows — the DH approval window dates (approval_start /
-- approval_end; NULL = the lane is always open) so the admin console's
-- edit form hydrates them.
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
                            'max_nominations_per_nominator', a.max_nominations_per_nominator,
                            'approval_start', a.approval_start,
                            'approval_end', a.approval_end)
                        ORDER BY a.name)
                   FROM awards a WHERE a.period_id = f.id), '[]'::jsonb))
           ORDER BY f.starts DESC)
      FROM fiscal_period f), '[]'::jsonb);
END; $$ LANGUAGE plpgsql;
