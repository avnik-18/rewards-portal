-- fn_nomination_decide at 0032: same rules as 0031's body + THE APPROVAL
-- WINDOW GUARD — the DH lane only acts while the award's approval window is
-- open (approval_start <= today <= approval_end; a NULL window = always
-- open). Before the start date the DMs still nominate (submission checks
-- remain on nominations_end); from the start date the /approvals queue
-- serves the award and the verdicts land; after the end date the lane shuts
-- (the row stays in review_stage='dh' for the admin/follow-up flow to own).
-- Window violation reuses the registered C5490 raise → 409
-- nomination_window_closed on the wire.
CREATE OR REPLACE FUNCTION fn_nomination_decide(
      p_nomination uuid, p_decider uuid, p_approve boolean,
      p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE v_nom RECORD; v_award RECORD;
BEGIN
  SELECT * INTO v_nom FROM awards_nominations WHERE id = p_nomination FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'C549M';
  END IF;

  SELECT * INTO v_award FROM awards WHERE id = v_nom.award_id;
  IF v_award.approval_start IS NOT NULL
     AND (v_award.approval_start > CURRENT_DATE
          OR (v_award.approval_end IS NOT NULL
              AND v_award.approval_end < CURRENT_DATE)) THEN
    RAISE EXCEPTION 'nomination_window_closed' USING ERRCODE = 'C5490';
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
