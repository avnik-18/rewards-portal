-- fn_nomination_decide at 0036: the DH lane scoped to its owner — with the
-- DM/DH leadership model the nomination routes to THE NOMINEE'S TEAM's DH
-- (teams.dh_id; a team nomination reads the nominee team row directly), not
-- to every leader. The decider must carry that team's lane; admin persona
-- overrides. Everything else (window guard, decline note requirement, the
-- endorse→admin / return transitions) matches 0032.
-- The unauthorized raise reuses the registered C549V SQLSTATE → 403
-- not_your_lane on the wire (recognition_service._SQLSTATE_TO_CODE).
CREATE OR REPLACE FUNCTION fn_nomination_decide(
      p_nomination uuid, p_decider uuid, p_approve boolean,
      p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE v_nom RECORD; v_award RECORD; v_lane_dh uuid;
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

  -- the lane rule: only this team's DH (or an admin) decides here — the
  -- nominee belongs to a team as a current member OR as the team's dm/dh
  -- owner (an owner's own nomination falls back to their team's lane)
  IF fn_persona(p_decider) <> 'admin' THEN
    IF v_nom.team_id IS NOT NULL THEN
      SELECT dh_id INTO v_lane_dh FROM teams WHERE id = v_nom.team_id;
    ELSE
      SELECT t.dh_id INTO v_lane_dh
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.valid_to IS NULL
       WHERE tm.user_id = v_nom.nominee_id
          OR t.dm_id = v_nom.nominee_id
          OR t.dh_id = v_nom.nominee_id
       ORDER BY t.name
       LIMIT 1;
    END IF;
    IF v_lane_dh IS NULL OR v_lane_dh <> p_decider THEN
      RAISE EXCEPTION 'not_your_lane' USING ERRCODE = 'C549V';
    END IF;
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
