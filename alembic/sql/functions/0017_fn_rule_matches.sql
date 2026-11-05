-- rule condition evaluator (from 0017_admin_flows): {"attr","op","value"} against a context
CREATE OR REPLACE FUNCTION fn_rule_matches(p_condition jsonb, p_ctx jsonb)
RETURNS boolean AS $$
DECLARE v_attr text; v_op text; v_value jsonb;
BEGIN
  IF p_condition IS NULL OR p_condition = '{}'::jsonb THEN RETURN true; END IF;
  v_attr  := p_condition->>'attr';
  v_op    := p_condition->>'op';
  v_value := p_condition->'value';
  RETURN CASE
    WHEN v_attr = 'recipient_count' AND v_op = 'gt' THEN
      (p_ctx->>'recipient_count')::int > (v_value)::int
    WHEN v_attr = 'recipient_count' AND v_op = 'lt' THEN
      (p_ctx->>'recipient_count')::int < (v_value)::int
    WHEN v_attr = 'recipient_count' AND v_op = 'eq' THEN
      (p_ctx->>'recipient_count')::int = (v_value)::int
    WHEN v_attr = 'kind' AND v_op = 'eq' THEN
      p_ctx->>'kind' = (v_value)::text
    WHEN v_attr = 'value_id' AND v_op = 'eq' THEN
      p_ctx->>'value_id' IS NOT NULL AND p_ctx->>'value_id' = (v_value)::text
    ELSE false END;
END; $$ LANGUAGE plpgsql;
