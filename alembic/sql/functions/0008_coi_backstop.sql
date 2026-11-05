-- COI backstop (from 0008_approvals, approvals verifier): a conflicted approver's
-- row can only be skipped/escalated
CREATE OR REPLACE FUNCTION coi_backstop() RETURNS trigger AS $$
DECLARE v_item RECORD; v_sub uuid; v_recoid uuid;
BEGIN
  SELECT submitter_id, recognition_id INTO v_sub, v_recoid
    FROM approval_item WHERE id = NEW.approval_item_id;
  IF v_sub IS NOT NULL AND NEW.status IN ('pending','approved') AND NEW.owner_id = v_sub THEN
    RAISE EXCEPTION 'coi_step_owner_is_submitter';
  END IF;
  IF v_recoid IS NOT NULL AND NEW.status IN ('pending','approved') THEN
    IF EXISTS (SELECT 1 FROM recognition_recipients
                WHERE recognition_id = v_recoid AND user_id = NEW.owner_id AND kind = 'to') THEN
      RAISE EXCEPTION 'coi_step_owner_is_recipient';
    END IF;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
