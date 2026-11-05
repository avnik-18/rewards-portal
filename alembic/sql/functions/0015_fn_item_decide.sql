-- decide one approval (from 0015_staff_fn): approve the lowest pending seq
-- (ANY mode) or decline it all. Last step approved => item approved + money
-- released, queue drains by trigger.
CREATE OR REPLACE FUNCTION fn_item_decide(
  p_item uuid, p_decider uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE v_item RECORD; v_pending smallint; v_rec uuid;
BEGIN
  SELECT * INTO v_item FROM approval_item WHERE id = p_item FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
  IF v_item.status <> 'pending' THEN RAISE EXCEPTION 'item_already_%', v_item.status; END IF;

  SELECT min(seq) INTO v_pending FROM approval_item_step
   WHERE approval_item_id = p_item AND status = 'pending'
     AND owner_id = p_decider;
  IF v_pending IS NULL THEN RAISE EXCEPTION 'not_pending_for_decider'; END IF;

  IF NOT p_approve THEN
    IF p_note IS NULL OR char_length(p_note) = 0 THEN RAISE EXCEPTION 'decline_note_required'; END IF;
    UPDATE approval_item_step
       SET status='declined', decided_by=p_decider, decided_at=now(), note=p_note
     WHERE approval_item_id = p_item AND seq = v_pending AND owner_id = p_decider
       AND status='pending';

    v_rec := v_item.recognition_id;
    PERFORM fn_decline_recognition(p_item, p_decider, p_note);
    UPDATE approval_item_step SET status='skipped', decided_by=p_decider, decided_at=now(), note=p_note
     WHERE approval_item_id = p_item AND status='pending';
    RETURN;
  END IF;

  UPDATE approval_item_step
     SET status='approved', decided_by=p_decider, decided_at=now(), note=p_note
   WHERE approval_item_id = p_item AND seq = v_pending AND owner_id = p_decider
     AND status='pending';

  IF NOT EXISTS (SELECT 1 FROM approval_item_step
                  WHERE approval_item_id = p_item AND status='pending') THEN
    PERFORM fn_approve_recognition(p_item, p_decider);
    UPDATE approval_item_step SET status='skipped', note='any-mode remainder'  -- tidy ANY chain
     WHERE approval_item_id = p_item AND status='pending' AND seq > v_pending;
  END IF;
END; $$ LANGUAGE plpgsql;
