-- fn_admin_upsert_award at 0032: same rules/locks as 0029's body, with the
-- SIGNATURE EXTENDED — trailing optional p_approval_start/p_approval_end, the
-- DH approval window for the category (0031's review lane): before the start
-- date the lane is closed (the DM nomination window still runs); the window
-- opens the /approvals queue for the award and closes it again at the end
-- date. NULL window = the lane is always open (back-compat for categories
-- authored before 0032).
CREATE OR REPLACE FUNCTION fn_admin_upsert_award(
      p_period uuid, p_award uuid, p_name text, p_value_id uuid,
      p_prize_points int, p_nominations_end date, p_voting_end date,
      p_requires_jury boolean, p_actor uuid, p_max_nominations int DEFAULT 1,
      p_cadence text DEFAULT 'quarterly', p_description text DEFAULT NULL,
      p_photo_url text DEFAULT NULL, p_guidelines jsonb DEFAULT NULL,
      p_approval_start date DEFAULT NULL, p_approval_end date DEFAULT NULL)
    RETURNS uuid AS $$
    DECLARE v_award RECORD; v_id uuid; v_is_new boolean := p_award IS NULL;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
      END IF;

      IF p_period IS NULL OR NOT EXISTS (SELECT 1 FROM fiscal_period WHERE id = p_period) THEN
        RAISE EXCEPTION 'period_not_found' USING ERRCODE = 'C549W';
      END IF;
      IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'award_name_required' USING ERRCODE = 'C549W';
      END IF;
      IF p_prize_points IS NULL OR p_prize_points < 1 THEN
        RAISE EXCEPTION 'prize_points_invalid' USING ERRCODE = 'C549W';
      END IF;
      IF p_max_nominations IS NULL OR p_max_nominations < 1 THEN
        RAISE EXCEPTION 'nominations_limit_invalid' USING ERRCODE = 'C549W';
      END IF;
      IF p_cadence IS NOT NULL AND p_cadence NOT IN ('monthly','quarterly','annual') THEN
        RAISE EXCEPTION 'award_cadence_invalid' USING ERRCODE = 'C549W';
      END IF;
      IF p_voting_end IS NOT NULL AND p_nominations_end IS NOT NULL
         AND p_voting_end < p_nominations_end THEN
        RAISE EXCEPTION 'voting_before_nominations' USING ERRCODE = 'C549W';
      END IF;
      IF p_approval_start IS NULL AND p_approval_end IS NOT NULL THEN
        RAISE EXCEPTION 'approval_window_needs_start' USING ERRCODE = 'C549W';
      END IF;
      IF p_approval_end IS NOT NULL AND p_approval_start IS NOT NULL
         AND p_approval_end < p_approval_start THEN
        RAISE EXCEPTION 'approval_window_before_start' USING ERRCODE = 'C549W';
      END IF;

      IF NOT v_is_new THEN
        SELECT * INTO v_award FROM awards WHERE id = p_award;
        IF NOT FOUND THEN RAISE EXCEPTION 'award_not_found' USING ERRCODE = 'C549W'; END IF;
        IF v_award.phase IN ('result', 'cancelled') THEN
          RAISE EXCEPTION 'award_locked' USING ERRCODE = 'C549X';
        END IF;
      END IF;

      -- pre-check the UNIQUE(period_id, name) violation with a friendly code
      IF EXISTS (SELECT 1 FROM awards
                  WHERE period_id = p_period AND name = trim(p_name)
                    AND (v_is_new OR id <> p_award)) THEN
        RAISE EXCEPTION 'award_name_duplicate' USING ERRCODE = 'C549W';
      END IF;

      IF v_is_new THEN
        INSERT INTO awards (period_id, name, value_id, prize_points, requires_jury,
                            phase, nominations_end, voting_end,
                            max_nominations_per_nominator,
                            cadence, description, photo_url, guidelines,
                            approval_start, approval_end)
        VALUES (p_period, trim(p_name), p_value_id, p_prize_points, p_requires_jury,
                'draft'::cycle_phase, p_nominations_end, p_voting_end,
                p_max_nominations,
                COALESCE(p_cadence, 'quarterly')::award_cadence, p_description, p_photo_url,
                p_guidelines, p_approval_start, p_approval_end)
        RETURNING id INTO v_id;
        INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
          VALUES (p_actor, 'awards.award_created', 'awards', v_id::text, NULL,
                  jsonb_build_object('period_id', p_period, 'name', trim(p_name),
                                     'prize_points', p_prize_points,
                                     'phase', 'draft',
                                     'nominations_end', p_nominations_end,
                                     'voting_end', p_voting_end,
                                     'max_nominations_per_nominator',
                                     p_max_nominations,
                                     'cadence', COALESCE(p_cadence, 'quarterly'),
                                     'photo_url', p_photo_url,
                                     'approval_start', p_approval_start,
                                     'approval_end', p_approval_end), now());
      ELSE
        UPDATE awards
           SET name = trim(p_name), value_id = p_value_id,
               prize_points = p_prize_points, requires_jury = p_requires_jury,
               nominations_end = p_nominations_end, voting_end = p_voting_end,
               max_nominations_per_nominator = p_max_nominations,
               cadence = COALESCE(p_cadence, v_award.cadence::text)::award_cadence,
               description = p_description, photo_url = p_photo_url,
               guidelines = p_guidelines,
               approval_start = p_approval_start, approval_end = p_approval_end
         WHERE id = p_award
        RETURNING id INTO v_id;
        INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
          VALUES (p_actor, 'awards.award_updated', 'awards', p_award::text,
                  jsonb_build_object('prize_points', v_award.prize_points,
                                     'phase', v_award.phase,
                                     'nominations_end', v_award.nominations_end,
                                     'voting_end', v_award.voting_end,
                                     'max_nominations_per_nominator',
                                     v_award.max_nominations_per_nominator,
                                     'approval_start', v_award.approval_start,
                                     'approval_end', v_award.approval_end),
                  jsonb_build_object('prize_points', p_prize_points,
                                     'phase', v_award.phase,
                                     'nominations_end', p_nominations_end,
                                     'voting_end', p_voting_end,
                                     'max_nominations_per_nominator',
                                     p_max_nominations,
                                     'cadence', COALESCE(p_cadence, v_award.cadence::text),
                                     'photo_url', p_photo_url,
                                     'approval_start', p_approval_start,
                                     'approval_end', p_approval_end), now());
      END IF;

      RETURN v_id;
    END; $$ LANGUAGE plpgsql;
