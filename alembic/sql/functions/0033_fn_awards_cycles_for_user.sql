-- fn_awards_cycles_for_user — the leader-facing "Award cycles" read API
-- (teammate's portal section; persona-agnostic like fn_awards_tile — the
-- caller is the viewer whose nomination allowance is reported). 0033: the
-- read TICKS the auto phase engine first, VOTING IS REMOVED (the cycle
-- timeline no longer carries voting_close; the award payload drops
-- voting_end and adds nominations_start), and the UI gate comment stays
-- in lock-step with fn_submit_nomination: phase='nominations' AND
-- window open AND allowance. Every award (category) is returned regardless
-- of phase — the UI filters.
CREATE OR REPLACE FUNCTION fn_awards_cycles_for_user(p_actor uuid)
RETURNS jsonb AS $$
BEGIN
  PERFORM fn_awards_auto_phase();

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
               'id', f.id,
               'name', f.name,
               'starts', f.starts,
               'ends', f.ends,
               'is_current', CURRENT_DATE BETWEEN f.starts AND f.ends,
               'nominations_close', f.nominations_close,
               'results_on', f.results_on,
               'categories', COALESCE((
                 SELECT jsonb_agg(jsonb_build_object(
                            'id', a.id,
                            'name', a.name,
                            'description', a.description,
                            'photo_url', a.photo_url,
                            'cadence', a.cadence,
                            'guidelines', a.guidelines,
                            'phase', a.phase,
                            'prize_points', a.prize_points,
                            'requires_jury', a.requires_jury,
                            'nominations_start', a.nominations_start,
                            'nominations_end', a.nominations_end,
                            'max_nominations_per_nominator',
                            a.max_nominations_per_nominator,
                            'nominated_by_me',
                            (SELECT count(*) FROM awards_nominations n
                              WHERE n.award_id = a.id AND n.nominator_id = p_actor),
                            'remaining_allowance',
                            GREATEST(a.max_nominations_per_nominator
                              - (SELECT count(*) FROM awards_nominations n
                                  WHERE n.award_id = a.id
                                    AND n.nominator_id = p_actor), 0))
                        ORDER BY a.name)
                   FROM awards a WHERE a.period_id = f.id), '[]'::jsonb))
           ORDER BY f.starts DESC)
      FROM fiscal_period f), '[]'::jsonb);
END; $$ LANGUAGE plpgsql;
