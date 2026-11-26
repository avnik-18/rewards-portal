-- fn_admin_delete_award — the cleanup path for dissolved awards.
-- Only a CANCELLED award can be deleted, and only after it has cooled:
--   - an award with nominations keeps its rows for 2 days past the cancel
--     (updated_at is the cancel touch) so nothing vanishes while a reviewer
--     might still be looking;
--   - an award with zero nominations is safe to remove immediately.
-- The DELETE cascades the nominations / jury assignments / ballots through
-- the 0009 FKs. Decided (result) awards are never deletable here — their
-- history belongs to the program and their payout is journal-linked.
CREATE OR REPLACE FUNCTION fn_admin_delete_award(
      p_award uuid, p_actor uuid)
    RETURNS void AS $$
    DECLARE v_award RECORD; v_noms int;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
      END IF;

      SELECT * INTO v_award FROM awards WHERE id = p_award;
      IF NOT FOUND THEN RAISE EXCEPTION 'award_not_found' USING ERRCODE = 'C549W'; END IF;

      IF v_award.phase <> 'cancelled' THEN
        RAISE EXCEPTION 'award_delete_needs_cancelled' USING ERRCODE = 'C549W';
      END IF;

      SELECT count(*) INTO v_noms FROM awards_nominations WHERE award_id = p_award;
      IF v_noms > 0 AND v_award.updated_at > now() - interval '2 days' THEN
        RAISE EXCEPTION 'award_delete_window' USING ERRCODE = 'C549W';
      END IF;

      DELETE FROM awards WHERE id = p_award;
      INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
        VALUES (p_actor, 'awards.award_deleted', 'awards', p_award::text,
                jsonb_build_object('name', v_award.name, 'phase', v_award.phase,
                                   'nominations', v_noms),
                NULL, now());
    END; $$ LANGUAGE plpgsql;
