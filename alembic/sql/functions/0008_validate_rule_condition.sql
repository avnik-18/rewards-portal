-- condition grammar validator (from 0008_approvals): fixed predicate shape
CREATE OR REPLACE FUNCTION validate_rule_condition() RETURNS trigger AS $$
BEGIN
  IF NEW.condition IS NULL THEN RETURN NEW; END IF;
  IF NOT (NEW.condition ? 'attr' AND NEW.condition ? 'op' AND NEW.condition ? 'value')
     OR jsonb_typeof(NEW.condition->'value') IS NULL THEN
    RAISE EXCEPTION 'invalid_condition_shape';
  END IF;
  IF NOT NEW.condition->>'attr' IN ('kind','value_id','cross_team','recipient_count')
     OR NOT NEW.condition->>'op' IN ('eq','in','gt','lt') THEN
    RAISE EXCEPTION 'invalid_condition_keys';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
