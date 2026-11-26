-- fn_admin_set_award_phase — run the cycle forward one step at a time.
-- Only the immediate forward transition is allowed (draft→nominations→
-- voting→result). Skip / backward / any move out of terminal phases is a
-- locked cycle (C549X); unknown phases are a validation failure (C549W).
-- No scheduler, no auto-transition (POC decision): admins drive this by hand.
-- CANCELLED is the one sideways move: a dissolve from any pre-decision phase
-- (draft/nominations/voting). A decided award (result) can never be dissolved,
-- and a cancelled one is terminal (the upsert-edit lock already lives there).
CREATE OR REPLACE FUNCTION fn_admin_set_award_phase(
      p_award uuid, p_phase text, p_actor uuid)
    RETURNS void AS $$
    DECLARE v_award RECORD;
      v_order constant text[] := ARRAY['draft', 'nominations', 'voting', 'result'];
      v_idx int; v_cur int;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
      END IF;

      IF p_phase IS NOT NULL AND lower(trim(p_phase)) = 'cancelled' THEN
        SELECT * INTO v_award FROM awards WHERE id = p_award;
        IF NOT FOUND THEN RAISE EXCEPTION 'award_not_found' USING ERRCODE = 'C549W'; END IF;
        IF v_award.phase IN ('result', 'cancelled') THEN
          RAISE EXCEPTION 'phase_transition_blocked' USING ERRCODE = 'C549X';
        END IF;
        UPDATE awards SET phase = 'cancelled'::cycle_phase WHERE id = p_award;
        INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
          VALUES (p_actor, 'awards.award_phase_changed', 'awards', p_award::text,
                  jsonb_build_object('phase', v_award.phase),
                  jsonb_build_object('phase', 'cancelled'), now());
        RETURN;
      END IF;

      IF p_phase IS NULL OR NOT (lower(trim(p_phase)) = ANY (v_order)) THEN
        RAISE EXCEPTION 'unknown_phase' USING ERRCODE = 'C549W';
      END IF;

      SELECT * INTO v_award FROM awards WHERE id = p_award;
      IF NOT FOUND THEN RAISE EXCEPTION 'award_not_found' USING ERRCODE = 'C549W'; END IF;

      v_cur := array_position(v_order, v_award.phase::text);
      v_idx := array_position(v_order, lower(trim(p_phase)));
      IF v_cur IS NULL OR v_idx IS NULL OR v_idx <> v_cur + 1 THEN
        RAISE EXCEPTION 'phase_transition_blocked' USING ERRCODE = 'C549X';
      END IF;

      UPDATE awards SET phase = lower(trim(p_phase))::cycle_phase WHERE id = p_award;
      INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
        VALUES (p_actor, 'awards.award_phase_changed', 'awards', p_award::text,
                jsonb_build_object('phase', v_award.phase),
                jsonb_build_object('phase', lower(trim(p_phase))), now());
    END; $$ LANGUAGE plpgsql;
