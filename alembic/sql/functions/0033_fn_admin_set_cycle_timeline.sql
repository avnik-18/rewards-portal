-- fn_admin_set_cycle_timeline at 0033 — VOTING REMOVED from the cycle
-- umbrella timeline (nominations_close → results_on; PUT semantics: the body
-- carries the full new timeline, null clears a date). Editing a cycle whose
-- awards have already been finalized (any award at phase 'result') is
-- locked, so history cannot be rewritten after the fact.
CREATE OR REPLACE FUNCTION fn_admin_set_cycle_timeline(
      p_actor uuid, p_period uuid, p_nominations_close date, p_results_on date)
RETURNS void AS $$
DECLARE v_period RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM role_assignment
                  WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
  END IF;

  SELECT * INTO v_period FROM fiscal_period WHERE id = p_period;
  IF NOT FOUND THEN RAISE EXCEPTION 'cycle_not_found' USING ERRCODE = 'C549W'; END IF;

  IF EXISTS (SELECT 1 FROM awards a
              WHERE a.period_id = p_period AND a.phase = 'result') THEN
    RAISE EXCEPTION 'award_locked' USING ERRCODE = 'C549X';
  END IF;

  IF p_nominations_close IS NOT NULL AND p_nominations_close < v_period.starts THEN
    RAISE EXCEPTION 'cycle_nominations_close_before_start' USING ERRCODE = 'C549W';
  END IF;
  IF p_results_on IS NOT NULL
     AND (p_nominations_close IS NULL OR p_results_on < p_nominations_close) THEN
    RAISE EXCEPTION 'cycle_results_before_nominations' USING ERRCODE = 'C549W';
  END IF;

  UPDATE fiscal_period
     SET nominations_close = p_nominations_close,
         results_on = p_results_on
   WHERE id = p_period;

  INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
    VALUES (p_actor, 'awards.cycle_timeline_updated', 'fiscal_period', p_period::text,
            jsonb_build_object('nominations_close', v_period.nominations_close,
                               'results_on', v_period.results_on),
            jsonb_build_object('nominations_close', p_nominations_close,
                               'results_on', p_results_on), now());
END; $$ LANGUAGE plpgsql;
