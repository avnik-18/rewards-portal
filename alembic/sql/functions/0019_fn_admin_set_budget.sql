CREATE OR REPLACE FUNCTION fn_admin_set_budget(
      p_user uuid, p_period uuid, p_new_allocated int, p_actor uuid)
    RETURNS void AS $$
    DECLARE v_alloc RECORD; v_old int;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
      END IF;
      IF p_user = p_actor THEN RAISE EXCEPTION 'self_admin_blocked' USING ERRCODE = 'C549P'; END IF;
      SELECT * INTO v_alloc FROM to_recog_points
       WHERE user_id = p_user AND period_id = p_period;
      IF NOT FOUND THEN RAISE EXCEPTION 'no_allowance_for_period' USING ERRCODE = 'C549D'; END IF;
      IF p_new_allocated < v_alloc.allocated - v_alloc.balance THEN
        RAISE EXCEPTION 'allocation_below_spent' USING ERRCODE = 'C549E';
      END IF;
      v_old := v_alloc.allocated;
      UPDATE to_recog_points SET allocated = p_new_allocated,
        balance = balance + (p_new_allocated - v_alloc.allocated)
       WHERE user_id = p_user AND period_id = p_period;
      INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
        VALUES (p_actor, 'budget.allocation_changed', 'to_recog_points', p_user::text,
          jsonb_build_object('allocated', v_old), jsonb_build_object('allocated', p_new_allocated), now());
    END; $$ LANGUAGE plpgsql;
