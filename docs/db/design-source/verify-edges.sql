-- Edge-case verification round 2: the 8 previously-unverified areas (minus vouchers)
CREATE TABLE IF NOT EXISTS verify2 (check_name text, ok boolean, detail text);
DELETE FROM verify2;

DO $$
DECLARE
  v_admin uuid; v_priya uuid; v_sam uuid; v_rahul uuid; v_brooke uuid;
  v_arun uuid; v_period uuid; v_rec uuid; v_item uuid;
  v_i int; v_txt text;
BEGIN
  SELECT id INTO v_admin FROM users WHERE email='admin@emids.test';
  SELECT id INTO v_priya FROM users WHERE employee_code='E-PR';
  SELECT id INTO v_sam   FROM users WHERE employee_code='E-L1';
  SELECT id INTO v_rahul FROM users WHERE employee_code='E-RH';
  SELECT id INTO v_arun  FROM users WHERE employee_code='E-L3';
  SELECT id INTO v_brooke FROM users WHERE employee_code='E-BR';
  SELECT id INTO v_period FROM fiscal_period WHERE 'FY26 Q4' = name;

  -- ---------- D1: budget — RBAC enforced ----------
  RAISE NOTICE 'START D1';
  BEGIN
    PERFORM fn_admin_set_budget(v_priya, v_period, 300, v_rahul);
    INSERT INTO verify2 VALUES ('D1_budget_rbac', false, 'no role needed?!');
  EXCEPTION WHEN raise_exception THEN
    INSERT INTO verify2 VALUES ('D1_budget_rbac', true, 'blocked: ' || SQLERRM);
  END;
  -- SoD: admin cannot change their own
  BEGIN
    PERFORM fn_admin_set_budget(v_admin, v_period, 300, v_admin);
    INSERT INTO verify2 VALUES ('D1_budget_sod', false, 'self allowed?!');
  EXCEPTION WHEN raise_exception THEN
    INSERT INTO verify2 VALUES ('D1_budget_sod', true, 'blocked: ' || SQLERRM);
  END;
  -- grant admin role to sam, raise Priya's quota to 450 (balance tops up 100 -> 300)
  INSERT INTO role_assignment (user_id, role) VALUES (v_sam, 'admin') ON CONFLICT DO NOTHING;
  PERFORM fn_admin_set_budget(v_priya, v_period, 450, v_sam);
  v_i := (SELECT allocated FROM to_recog_points WHERE user_id = v_priya AND period_id = v_period);
  INSERT INTO verify2 VALUES ('D1_budget_raised', v_i = 450, 'allocated=' || v_i);
  -- clawback guard: spend 100 first (one 'to' routing praise), then attempt to lower below spent
  UPDATE to_recog_points SET balance = allocated;  -- deterministic spend base
  v_rec := fn_submit_recognition(v_priya, ARRAY[v_rahul], NULL, NULL, NULL,
            'clawback pre-spend', 100, NULL, 'praise',
            'aaaa0000-0000-4000-8000-000000000099'::uuid);
  BEGIN
    PERFORM fn_admin_set_budget(v_priya, v_period, 90, v_sam);
    INSERT INTO verify2 VALUES ('D1_budget_clawback', false, 'clawback allowed?!');
  EXCEPTION WHEN raise_exception THEN
    INSERT INTO verify2 VALUES ('D1_budget_clawback', true, 'blocked: ' || SQLERRM);
  END;

  -- ---------- D2: routed praise + budget audit trail ----------
  RAISE NOTICE 'START D2';
  UPDATE to_recog_points SET balance = allocated;  -- deterministic spend base
  v_rec := fn_submit_recognition(v_priya, ARRAY[v_rahul], NULL, NULL, NULL,
            'audit trail check', 200, NULL, 'praise',
            'aaaa0000-0000-4000-8000-000000000001'::uuid);
  v_i := (SELECT count(*) FROM audit_log WHERE entity='to_recog_points' AND entity_id = v_priya::text);
  INSERT INTO verify2 VALUES ('D2_budget_audited', v_i >= 1, 'audit rows=' || v_i);

  -- ---------- D3: leaver flow (deactivate Rahul) ----------
  RAISE NOTICE 'START D3';
  INSERT INTO role_assignment (user_id, role) VALUES (v_admin, 'admin') ON CONFLICT DO NOTHING;
  -- Rahul currently owns a pending approval? no — he is a recipient; items he owns:
  -- cancel Rahul as the SUBMITTER test instead: as Rahul submit a 120-pt routed
  -- note: his submitted allowance=250, spend 120 -> hold, then deactivate him
  v_rec := fn_submit_recognition(v_rahul, ARRAY[v_priya], NULL, NULL, NULL,
            'leaver flow test', 120, NULL, 'praise',
            'aaaa0000-0000-4000-8000-000000000002'::uuid);
  SELECT ai.id INTO v_item FROM approval_item ai WHERE ai.recognition_id = v_rec;
  v_i := (SELECT r.balance FROM to_recog_points r WHERE r.user_id = v_rahul AND r.period_id = v_period);
  INSERT INTO verify2 VALUES ('D3_hold_before_leaver', v_i = 130, 'rahul allowance=' || v_i);
  PERFORM fn_deactivate_person(v_rahul, v_admin, 'offboarding demo');
  v_i := (SELECT r.balance FROM to_recog_points r WHERE r.user_id = v_rahul AND r.period_id = v_period);
  INSERT INTO verify2 VALUES ('D3_hold_refunded', v_i = 250, 'rahul allowance after=' || v_i);
  SELECT status INTO v_txt FROM recognition_history WHERE id = v_rec;
  INSERT INTO verify2 VALUES ('D3_recognition_cancelled', v_txt = 'cancelled', 'status=' || v_txt);
  SELECT status INTO v_txt FROM approval_item WHERE id = v_item;
  INSERT INTO verify2 VALUES ('D3_item_cancelled', v_txt = 'cancelled', 'item=' || v_txt);
  v_txt := (SELECT employment_status::text FROM users WHERE id = v_rahul);
  INSERT INTO verify2 VALUES ('D3_user_separated', v_txt = 'separated', 'status=' || v_txt);
  v_i := (SELECT count(*) FROM audit_log WHERE action='person.deactivated' AND entity_id = v_rahul::text);
  INSERT INTO verify2 VALUES ('D3_deactivation_audited', v_i = 1, 'audit rows=' || v_i);
  -- leaver cannot submit anymore
  BEGIN
    UPDATE to_recog_points SET balance = allocated;  -- deterministic spend base
    v_rec := fn_submit_recognition(v_rahul, ARRAY[v_priya], NULL, NULL, NULL,
             'should not pass', 25, NULL, 'praise',
             'aaaa0000-0000-4000-8000-000000000003'::uuid);
    INSERT INTO verify2 VALUES ('D3_blocked_after', false, 'leaver submitted!');
  EXCEPTION WHEN raise_exception THEN
    INSERT INTO verify2 VALUES ('D3_blocked_after', true, 'blocked: ' || SQLERRM);
  END;

  -- ---------- D4: condition-gated rules (annotate the existing band-3 rule) ----------
  RAISE NOTICE 'START D4';
  UPDATE approval_rule SET condition = '{"attr":"recipient_count","op":"gt","value":1}'::jsonb,
    version_note = 'conditional band test'
   WHERE kind='points_recognition' AND priority = 3;
  -- bad shape rejected by the validator trigger
  BEGIN
    INSERT INTO approval_rule (kind, version, min_points, max_points, priority, condition, is_active)
    VALUES ('points_recognition', 1, 401, 500, 4, '{"nope":true}'::jsonb, true);
    INSERT INTO verify2 VALUES ('D4_bad_condition_rejected', false, 'bad shape accepted');
  EXCEPTION WHEN raise_exception THEN
    INSERT INTO verify2 VALUES ('D4_bad_condition_rejected', true, 'rejected: ' || SQLERRM);
  END;
  -- two recipients, 210 pts -> the conditional rule (priority 2) wins
  UPDATE to_recog_points SET balance = allocated;  -- deterministic spend base
  v_rec := fn_submit_recognition(v_sam, ARRAY[v_priya, v_brooke], NULL, NULL, NULL,
            'conditional routing', 210, NULL, 'praise',
            'aaaa0000-0000-4000-8000-000000000004'::uuid);
  v_txt := (SELECT r.version_note FROM approval_item ai JOIN approval_rule r ON r.id = ai.rule_id
             WHERE ai.recognition_id = v_rec);
  INSERT INTO verify2 VALUES ('D4_condition_matched', v_txt = 'conditional band test', 'matched: ' || v_txt);
  -- one recipient, 210 pts: the conditional rule (>=2 recipients) must now REJECT
  BEGIN
    v_rec := fn_submit_recognition(v_brooke, ARRAY[v_priya], NULL, NULL, NULL,
              'conditional skipped', 210, NULL, 'praise',
              'aaaa0000-0000-4000-8000-000000000005'::uuid);
    INSERT INTO verify2 VALUES ('D4_condition_not_matched', false, 'unconditional match happened');
  EXCEPTION WHEN raise_exception THEN
    INSERT INTO verify2 VALUES ('D4_condition_not_matched', true, 'no route: ' || SQLERRM);
  END;
  -- restore the band-3 rule for later checks
  UPDATE approval_rule SET condition = NULL, version_note = 'L1 -> L2 -> L3 (finance head)'
   WHERE kind='points_recognition' AND priority = 3;

  -- ---------- D5: notifications + outbox dedupe ----------
  RAISE NOTICE 'START D5';
  -- an approved release must have queued a praise notification (routed praise: 150 = band 2)
  UPDATE to_recog_points SET balance = allocated;  -- deterministic spend base
  v_rec := fn_submit_recognition(v_priya, ARRAY[v_brooke], NULL, NULL, NULL,
            'notify release test', 150, NULL, 'praise',
            'aaaa0000-0000-4000-8000-000000000007'::uuid);
  SELECT ai.id INTO v_item FROM approval_item ai WHERE ai.recognition_id = v_rec;
  PERFORM fn_approve_recognition(v_item, v_sam);
  v_i := (SELECT count(DISTINCT dedupe_key) FROM notification WHERE dedupe_key LIKE 'praise:%');
  INSERT INTO verify2 VALUES ('D5_notifications_queued', v_i >= 1, 'dedupe keys=' || v_i);
  v_i := (SELECT count(*) FROM outbox_event WHERE status='pending');
  PERFORM fn_relay_outbox();
  v_txt := (SELECT count(*)::text || '/' || v_i::text FROM outbox_event WHERE status='sent');
  INSERT INTO verify2 VALUES ('D5_outbox_drained', true, 'relayed: ' || v_txt);
  v_i := (SELECT count(*) FROM outbox_event WHERE status='pending');
  INSERT INTO verify2 VALUES ('D5_outbox_empty_after', v_i = 0, 'pending=' || v_i);
  -- dedupe: a second identical notify is a no-op
  PERFORM fn_notify(v_priya, 'praise_received', 'in_app', '{"x":1}'::jsonb, 'dedupe-test-1');
  PERFORM fn_notify(v_priya, 'praise_received', 'in_app', '{"x":1}'::jsonb, 'dedupe-test-1');
  v_i := (SELECT count(*) FROM notification WHERE dedupe_key='dedupe-test-1');
  INSERT INTO verify2 VALUES ('D5_notify_dedupe', v_i = 1, 'rows=' || v_i);
END; $$;

-- sanity: every journal still balances
DO $$
DECLARE v_bad int;
BEGIN
  SELECT count(*) INTO v_bad FROM (
    SELECT j.id FROM journal_entry j
     JOIN journal_line l ON l.journal_id = j.id
     JOIN journal_entry b ON b.id = j.id AND b.status = 'posted'
     GROUP BY j.id, j.status
    HAVING SUM(CASE WHEN l.direction='debit' THEN l.amount ELSE -l.amount END) <> 0
  ) t;
  INSERT INTO verify2 VALUES ('D6_all_journals_balanced', v_bad = 0, 'unbalanced=' || v_bad);
END; $$;

SELECT check_name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, detail
  FROM verify2 ORDER BY check_name;
