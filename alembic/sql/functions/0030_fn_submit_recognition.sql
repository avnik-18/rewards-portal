-- fn_submit_recognition at 0030: the approval workflow is retired. A
-- recognition is a zero-point cheers-for-peers only, approved at insert
-- and published to feed_post inside the same transaction — no holds, no
-- routing, no approval items. Any nonzero send is rejected; the award lane
-- (prize points) lives in the awards table, not here.
CREATE OR REPLACE FUNCTION fn_submit_recognition(
      p_from_user uuid, p_to_ids uuid[], p_cc_ids uuid[] DEFAULT NULL,
      p_value_id uuid DEFAULT NULL, p_template_id uuid DEFAULT NULL,
      p_message text DEFAULT '', p_base_points int DEFAULT 0,
      p_art_url text DEFAULT NULL, p_kind recognition_kind DEFAULT 'praise',
      p_idempotency_key uuid DEFAULT NULL)
    RETURNS uuid AS $$
    DECLARE
      v_recognition uuid;
      v_user RECORD; v_giver RECORD; v_cc uuid;
      v_i int; v_value_id uuid; v_tpl_value uuid; v_tpl_active boolean;
    BEGIN
      IF p_base_points <> 0 THEN
        RAISE EXCEPTION 'points_out_of_range' USING ERRCODE = 'C5496';  -- cheers carry no points
      END IF;

      SELECT * INTO v_giver FROM users WHERE id = p_from_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'person_not_found' USING ERRCODE = 'C549N'; END IF;
      IF NOT (COALESCE(v_giver.recognition_eligible, v_giver.employment_status = 'active')) THEN
        RAISE EXCEPTION 'person_inactive' USING ERRCODE = 'C5492'; END IF;
      IF p_to_ids && ARRAY[p_from_user] THEN RAISE EXCEPTION 'self_recognition_blocked' USING ERRCODE = 'C5494'; END IF;
      IF p_to_ids IS NULL OR array_length(p_to_ids,1) = 0 THEN
        RAISE EXCEPTION 'recipient_not_found' USING ERRCODE = 'C549A';
      END IF;

      -- reference guards (List A): value then template — mismatch after both
      -- rows are known, so the 404s never collide with the validation 422.
      v_value_id := p_value_id;
      IF p_value_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM emids_values WHERE id = p_value_id) THEN
          RAISE EXCEPTION 'value_not_found' USING ERRCODE = 'C5497';
        END IF;
      END IF;
      IF p_template_id IS NOT NULL THEN
        SELECT value_id, is_active INTO v_tpl_value, v_tpl_active
          FROM recognition_templates WHERE id = p_template_id;
        IF NOT FOUND OR NOT v_tpl_active THEN
          RAISE EXCEPTION 'template_not_found' USING ERRCODE = 'C5498';
        END IF;
        IF p_value_id IS NOT NULL AND v_tpl_value <> p_value_id THEN
          RAISE EXCEPTION 'template_value_mismatch' USING ERRCODE = 'C5499';
        END IF;
        IF v_value_id IS NULL THEN v_value_id := v_tpl_value; END IF;
      END IF;

      INSERT INTO recognition_history (kind, from_user_id, value_id, template_id,
        message, base_points, art_url, status, idempotency_key)
      VALUES (p_kind, p_from_user, v_value_id, p_template_id, p_message, 0,
        p_art_url, 'approved'::recognition_status,
        p_idempotency_key)
      RETURNING id INTO v_recognition;

      IF p_to_ids IS NOT NULL THEN
        FOR v_i IN 1 .. array_length(p_to_ids,1) LOOP
          SELECT employment_status, source, recognition_eligible INTO v_user FROM users WHERE id = p_to_ids[v_i];
          IF NOT FOUND THEN RAISE EXCEPTION 'recipient_not_found: %', p_to_ids[v_i] USING ERRCODE = 'C549A'; END IF;
          IF v_user.source = 'guest' THEN RAISE EXCEPTION 'guest_cannot_receive' USING ERRCODE = 'C549B'; END IF;
          IF NOT (COALESCE(v_user.recognition_eligible, v_user.employment_status = 'active')) THEN
            RAISE EXCEPTION 'person_inactive' USING ERRCODE = 'C5492'; END IF;
          INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
          VALUES (v_recognition, p_to_ids[v_i], 0, 'to');
        END LOOP;
      END IF;
      IF p_cc_ids IS NOT NULL THEN
        FOREACH v_cc IN ARRAY p_cc_ids LOOP
          IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_cc) THEN
            RAISE EXCEPTION 'recipient_not_found: %', v_cc USING ERRCODE = 'C549A'; END IF;
          INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
          VALUES (v_recognition, v_cc, 0, 'cc');
        END LOOP;
      END IF;

      -- direct publish: the feed row is part of the same transaction, so a
      -- successful send is on the feed when the caller hears back.
      INSERT INTO feed_post (kind, entity_type, entity_id, is_public, actor_id, occurred_at, is_bu)
      VALUES ('recognition', 'recognition', v_recognition, true, p_from_user, now(), false)
      ON CONFLICT (entity_type, entity_id) DO NOTHING;

      PERFORM fn_notify_recognition_parties(v_recognition);
      RETURN v_recognition;
    END; $$ LANGUAGE plpgsql;
