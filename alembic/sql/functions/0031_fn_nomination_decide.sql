-- fn_nomination_decide — the department head's verdict on one nomination
-- (0031, DH approval slice). The DM's submitted nomination waits in the
-- review lane (review_stage='dh'); the DH's call moves it ONWARD:
--   approve → status='endorsed', review_stage='admin' — routed to the admin
--             lane (the wired admin-decision step is the NEXT work item; the
--             row is already staged for it, so it needs no schema change).
--   decline → status='returned', review_stage='done' — final, the nominator
--             reads the note; decline_note_required mirrors the approval
--             engine (0019 C549L): a rejection never lands without a reason.
-- Race safety: the row is locked (FOR UPDATE) so two concurrent verdicts
-- cannot both pass the review_stage='dh' gate.
-- Error contract: item_not_found C549M → 404, item_already_decided C5495
-- dynamic ('item_already_' prefix → 409), decline_note_required C549L → 400.
CREATE OR REPLACE FUNCTION fn_nomination_decide(
      p_nomination uuid, p_decider uuid, p_approve boolean,
      p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE v_nom RECORD;
BEGIN
  SELECT * INTO v_nom FROM awards_nominations WHERE id = p_nomination FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'C549M';
  END IF;

  IF v_nom.review_stage <> 'dh' THEN
    RAISE EXCEPTION 'item_already_decided' USING ERRCODE = 'C5495';
  END IF;

  IF NOT p_approve THEN
    IF p_note IS NULL OR char_length(BTRIM(p_note)) = 0 THEN
      RAISE EXCEPTION 'decline_note_required' USING ERRCODE = 'C549L';
    END IF;
    UPDATE awards_nominations
       SET status = 'returned'::nomination_status,
           review_stage = 'done',
           decided_by = p_decider,
           decided_at = now(),
           decision_note = BTRIM(p_note)
     WHERE id = p_nomination;
    RETURN;
  END IF;

  UPDATE awards_nominations
     SET status = 'endorsed'::nomination_status,
         review_stage = 'admin',
         decided_by = p_decider,
         decided_at = now()
   WHERE id = p_nomination;
END; $$ LANGUAGE plpgsql;
