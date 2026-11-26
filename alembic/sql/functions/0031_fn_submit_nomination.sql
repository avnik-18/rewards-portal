-- fn_submit_nomination — nomination submission (Work Item #3: the per-category
-- nomination-limit enforcement lives HERE, in the DB per ADR 0001).
-- The awarding PIPELINE AFTER this (shortlist → jury → ballots → awarding,
-- fn_finalize_award) is the teammate's — this fn only creates the
-- status='submitted' row and is deliberately silent: no notify, no ballot.
-- Race safety: the awards row is locked (FOR UPDATE) while the nominator's
-- prior submissions are counted, so two concurrent submissions by the same
-- nominator can never both pass the cap; the UNIQUE (award_id, nominee_id)
-- index is the duplicate backstop (pre-checked for the friendly code).
-- 0031 extension: the dossier supports the DH approval lane — optional
-- achievements + supporting docs are persisted beside the story, and every
-- submitted row enters the department-head review lane (review_stage='dh').
-- Nominee eligibility mirrors fn_submit_recognition's giver rule
-- (COALESCE(recognition_eligible, employment_status = 'active')).
CREATE OR REPLACE FUNCTION fn_submit_nomination(
      p_award uuid, p_nominee uuid, p_nominator uuid, p_story text,
      p_achievements jsonb DEFAULT '[]'::jsonb,
      p_docs jsonb DEFAULT '[]'::jsonb)
RETURNS uuid AS $$
DECLARE v_award RECORD; v_nominee RECORD; v_used int; v_id uuid;
BEGIN
  SELECT * INTO v_award FROM awards WHERE id = p_award FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'award_not_found' USING ERRCODE = 'C549M';
  END IF;

  IF v_award.phase <> 'nominations'
     OR (v_award.nominations_end IS NOT NULL
         AND v_award.nominations_end < CURRENT_DATE) THEN
    RAISE EXCEPTION 'nomination_window_closed' USING ERRCODE = 'C5490';
  END IF;

  SELECT recognition_eligible, employment_status INTO v_nominee
    FROM users WHERE id = p_nominee;
  IF NOT FOUND THEN RAISE EXCEPTION 'person_not_found' USING ERRCODE = 'C549N'; END IF;
  IF NOT (COALESCE(v_nominee.recognition_eligible,
                   v_nominee.employment_status = 'active')) THEN
    RAISE EXCEPTION 'person_inactive' USING ERRCODE = 'C5492';
  END IF;

  IF EXISTS (SELECT 1 FROM awards_nominations
              WHERE award_id = p_award AND nominee_id = p_nominee) THEN
    RAISE EXCEPTION 'item_already_nominated' USING ERRCODE = 'C5495';
  END IF;

  SELECT count(*) INTO v_used FROM awards_nominations
    WHERE award_id = p_award AND nominator_id = p_nominator;
  IF v_used >= v_award.max_nominations_per_nominator THEN
    RAISE EXCEPTION 'nomination_limit_reached' USING ERRCODE = 'C549J';
  END IF;

  -- the table CHECK pins is_self_nomination = (nominator_id = nominee_id)
  INSERT INTO awards_nominations
    (award_id, nominee_id, nominator_id, story, is_self_nomination, status,
     achievements, supporting_docs, review_stage)
  VALUES (p_award, p_nominee, p_nominator, COALESCE(p_story, ''),
          p_nominee = p_nominator, 'submitted'::nomination_status,
          COALESCE(p_achievements, '[]'::jsonb),
          COALESCE(p_docs, '[]'::jsonb),
          'dh')
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$ LANGUAGE plpgsql;
