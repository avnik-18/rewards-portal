-- fn_admin_create_cycle at 0033 — VOTING REMOVED from the cycle timeline
-- (fiscal_period.voting_close is dropped by the migration): the umbrella
-- timeline is nominations_close → results_on. Admin creates an award cycle:
-- a fiscal_period row (the cycle IS the period — 0027's model) with its
-- timeline. Cadence is NOT a cycle property — it belongs to the award types
-- carried by the categories inside the cycle. Name must be unique
-- (fiscal_period.name is UNIQUE not NULL anyway, pre-checked here for the
-- friendly code); cycles must not overlap.
CREATE OR REPLACE FUNCTION fn_admin_create_cycle(
      p_actor uuid, p_name text, p_start_date date, p_end_date date,
      p_nominations_close date, p_results_on date)
RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM role_assignment
                  WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
  END IF;

  IF p_name IS NULL OR char_length(trim(p_name)) = 0
     OR char_length(trim(p_name)) > 80 THEN
    RAISE EXCEPTION 'cycle_name_invalid' USING ERRCODE = 'C549W';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date <= p_start_date THEN
    RAISE EXCEPTION 'cycle_dates_invalid' USING ERRCODE = 'C549W';
  END IF;
  IF p_nominations_close IS NOT NULL AND p_nominations_close < p_start_date THEN
    RAISE EXCEPTION 'cycle_nominations_close_before_start' USING ERRCODE = 'C549W';
  END IF;
  IF p_results_on IS NOT NULL
     AND (p_nominations_close IS NULL OR p_results_on < p_nominations_close) THEN
    RAISE EXCEPTION 'cycle_results_before_nominations' USING ERRCODE = 'C549W';
  END IF;

  IF EXISTS (SELECT 1 FROM fiscal_period f
              WHERE f.name = trim(p_name)
                 OR NOT (f.ends < p_start_date OR f.starts > p_end_date)) THEN
    RAISE EXCEPTION 'cycle_period_conflict' USING ERRCODE = 'C549W';
  END IF;

  INSERT INTO fiscal_period (name, starts, ends,
                             nominations_close, results_on)
  VALUES (trim(p_name), p_start_date, p_end_date,
          p_nominations_close, p_results_on)
  RETURNING id INTO v_id;

  INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
    VALUES (p_actor, 'awards.cycle_created', 'fiscal_period', v_id::text, NULL,
            jsonb_build_object('name', trim(p_name),
                               'starts', p_start_date, 'ends', p_end_date,
                               'nominations_close', p_nominations_close,
                               'results_on', p_results_on), now());

  RETURN v_id;
END; $$ LANGUAGE plpgsql;
