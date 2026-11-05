-- fn_submit_recognition at 0019: reviewer semantics + USING ERRCODE on every business
-- raise, no debug NOTICEs, FOR UPDATE OF t serialising concurrent submits on the allowance.
CREATE OR REPLACE FUNCTION fn_submit_recognition(
      p_from_user uuid, p_to_ids uuid[], p_cc_ids uuid[] DEFAULT NULL,
      p_value_id uuid DEFAULT NULL, p_template_id uuid DEFAULT NULL,
      p_message text DEFAULT '', p_base_points int DEFAULT 0,
      p_art_url text DEFAULT NULL, p_kind recognition_kind DEFAULT 'praise',
      p_idempotency_key uuid DEFAULT NULL)
    RETURNS uuid AS $$
    DECLARE
      v_recognition uuid; v_journal uuid; v_line uuid; v_item uuid;
      v_buyer uuid; v_rule uuid; v_version int; v_total int;
      v_user RECORD; v_giver RECORD; v_alloc uuid; v_i int; v_share int;
      v_steps RECORD; v_owner uuid; v_condition_ctx jsonb;
    BEGIN
      SELECT * INTO v_giver FROM users WHERE id = p_from_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'person_not_found' USING ERRCODE = 'C549N'; END IF;
      IF NOT (COALESCE(v_giver.recognition_eligible, v_giver.employment_status = 'active')) THEN
        RAISE EXCEPTION 'person_inactive' USING ERRCODE = 'C5492'; END IF;
      IF p_to_ids && ARRAY[p_from_user] THEN RAISE EXCEPTION 'self_recognition_blocked' USING ERRCODE = 'C5494'; END IF;
      IF p_base_points < 0 OR p_base_points > 9999 THEN RAISE EXCEPTION 'points_out_of_range' USING ERRCODE = 'C5496'; END IF;

      INSERT INTO recognition_history (kind, from_user_id, value_id, template_id,
        message, base_points, art_url, status, idempotency_key)
      VALUES (p_kind, p_from_user, p_value_id, p_template_id, p_message, p_base_points,
        p_art_url, (CASE WHEN p_base_points = 0 THEN 'approved' ELSE 'pending_approval' END)::recognition_status,
        p_idempotency_key)
      RETURNING id INTO v_recognition;

      IF p_to_ids IS NOT NULL THEN
        FOR v_i IN 1 .. array_length(p_to_ids,1) LOOP
          v_buyer := p_to_ids[v_i];
          SELECT employment_status, source, recognition_eligible INTO v_user FROM users WHERE id = v_buyer;
          IF NOT FOUND THEN RAISE EXCEPTION 'recipient_not_found: %', v_buyer USING ERRCODE = 'C549A'; END IF;
          IF v_user.source = 'guest' THEN RAISE EXCEPTION 'guest_cannot_receive' USING ERRCODE = 'C549B'; END IF;
          IF NOT (COALESCE(v_user.recognition_eligible, v_user.employment_status = 'active')) THEN
            RAISE EXCEPTION 'person_inactive' USING ERRCODE = 'C5492'; END IF;
          v_share := CASE WHEN p_base_points = 0 THEN 0
                          WHEN v_i < array_length(p_to_ids,1)
                            THEN p_base_points / array_length(p_to_ids,1)
                          ELSE p_base_points - (p_base_points / array_length(p_to_ids,1)) * (array_length(p_to_ids,1)-1)
                     END;
          INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
          VALUES (v_recognition, v_buyer, v_share, 'to');
        END LOOP;
      END IF;
      IF p_cc_ids IS NOT NULL THEN
        FOREACH v_buyer IN ARRAY p_cc_ids LOOP
          IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_buyer) THEN
            RAISE EXCEPTION 'recipient_not_found: %', v_buyer USING ERRCODE = 'C549A'; END IF;
          INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
          VALUES (v_recognition, v_buyer, 0, 'cc');
        END LOOP;
      END IF;

      IF p_base_points = 0 THEN RETURN v_recognition; END IF;

      SELECT SUM(points) INTO v_total FROM recognition_recipients
       WHERE recognition_id = v_recognition AND kind='to';
      IF v_total <> p_base_points THEN
        RAISE EXCEPTION 'recipient_total_mismatch: % <> %', v_total, p_base_points USING ERRCODE = 'C549C';
      END IF;

      SELECT t.id INTO v_alloc
        FROM to_recog_points t JOIN fiscal_period f ON f.id = t.period_id
       WHERE t.user_id = p_from_user AND now()::date BETWEEN f.starts AND f.ends
         FOR UPDATE OF t;
      IF v_alloc IS NULL THEN RAISE EXCEPTION 'no_allowance_for_period' USING ERRCODE = 'C549D'; END IF;
      IF NOT EXISTS (SELECT 1 FROM to_recog_points WHERE id = v_alloc AND balance >= p_base_points) THEN
        RAISE EXCEPTION 'insufficient_points' USING ERRCODE = 'C5491';
      END IF;

      INSERT INTO journal_entry (kind, memo, linked_recognition_id)
        VALUES ('recognition_hold', 'recognition hold', v_recognition)
        RETURNING id INTO v_journal;
      INSERT INTO ledger (journal_id, to_recog_points_id, kind, amount, user_id)
        VALUES (v_journal, v_alloc, 'recognition_hold', -p_base_points, v_giver.id)
        RETURNING id INTO v_line;
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, a.id, 'debit', p_base_points
          FROM ledger_account a WHERE a.kind='user_wallet' AND a.allowance_id = v_alloc LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: allowance' USING ERRCODE = 'C549R'; END IF;
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, a.id, 'credit', p_base_points
          FROM ledger_account a WHERE a.code = 'SYS_PENDING' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: SYS_PENDING' USING ERRCODE = 'C549R'; END IF;

      v_condition_ctx := jsonb_build_object(
        'recipient_count', COALESCE(array_length(p_to_ids,1), 0),
        'kind', p_kind::text
      );
      SELECT r.id, r.version INTO v_rule, v_version
        FROM approval_rule r
       WHERE r.kind = 'points_recognition' AND r.is_active
         AND COALESCE(r.min_points, 0) <= p_base_points
         AND COALESCE(r.max_points, 999999) >= p_base_points
         AND fn_rule_matches(r.condition, v_condition_ctx)
       ORDER BY r.priority ASC LIMIT 1;
      IF v_rule IS NULL THEN
        RAISE EXCEPTION 'no_approval_route' USING ERRCODE = 'C549F';
      END IF;

      SELECT count(*) INTO v_total FROM approval_rule_step WHERE rule_id = v_rule;
      IF v_total = 0 THEN
        PERFORM fn_release_recognition(v_recognition, p_from_user, 'auto-approved');
        UPDATE recognition_history SET status='approved' WHERE id = v_recognition;
        RETURN v_recognition;
      END IF;

      INSERT INTO approval_item (kind, submitter_id, rule_id, rule_version,
        recognition_id, snapshot, status)
      VALUES ('points_recognition', p_from_user, v_rule, v_version, v_recognition,
        jsonb_build_object('recognition_id', v_recognition, 'base_points', p_base_points,
          'message', p_message, 'toIds', to_jsonb(p_to_ids), 'ccIds', to_jsonb(coalesce(p_cc_ids, '{}'::uuid[])),
          'value_id', p_value_id, 'template_id', p_template_id, 'art_url', p_art_url,
          'policy', jsonb_build_object('verdict','pass','notes','[]'::jsonb)),
        'pending')
      RETURNING id INTO v_item;

      FOR v_steps IN
        SELECT s.seq, s.level, s.subject, s.fixed_user_id, s.mode, s.sla_hours FROM approval_rule_step s
        WHERE s.rule_id = v_rule ORDER BY s.seq
      LOOP
        v_owner := CASE v_steps.subject
          WHEN 'submitter_manager' THEN (SELECT manager_id FROM users WHERE id = p_from_user)
          WHEN 'submitter_manager_manager' THEN
               (SELECT u2.manager_id FROM users u1 JOIN users u2 ON u2.id = u1.manager_id
                 WHERE u1.id = p_from_user)
          WHEN 'fixed_user' THEN v_steps.fixed_user_id
          ELSE NULL END;
        -- org-top givers (no manager above) fall back to another admin (B2 escalation rule)
        IF v_owner IS NULL THEN
          SELECT ra.user_id INTO v_owner FROM role_assignment ra
           WHERE ra.role = 'admin' AND ra.revoked_at IS NULL
             AND ra.user_id <> p_from_user
           ORDER BY ra.user_id LIMIT 1;
        END IF;
        IF v_owner IS NULL THEN RAISE EXCEPTION 'approver_unresolvable_at_step_%', v_steps.seq USING ERRCODE = 'C549G'; END IF;
        INSERT INTO approval_item_step (approval_item_id, seq, level, owner_id, mode, sla_due, status, note)
        VALUES (v_item, v_steps.seq, v_steps.level, v_owner, v_steps.mode,
                CASE WHEN v_steps.sla_hours IS NOT NULL THEN now() + (v_steps.sla_hours || ' hours')::interval END,
                'pending', NULL);
      END LOOP;

      PERFORM fn_notify(p_from_user, 'approval_pending', 'in_app',
        jsonb_build_object('item', v_item), 'pending:' || v_item::text);
      RETURN v_recognition;
    END; $$ LANGUAGE plpgsql;
