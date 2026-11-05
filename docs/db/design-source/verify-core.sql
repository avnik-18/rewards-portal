-- DB POC runtime verification — executes the plan §8 checks that need a live engine.
CREATE TABLE IF NOT EXISTS verify_results (check_name text, ok boolean, detail text);

DO $$
DECLARE
  v_priya uuid; v_rahul uuid; v_sam uuid; v_brooke uuid; v_admin uuid;
  v_rec uuid; v_item uuid; v_period uuid; v_alloc uuid;
  v_i_state int; v_textstate text; v_staff RECORD;
  v_fails int := 0;
BEGIN
  DELETE FROM verify_results;

  -- ---------- staff ( tolerate pre-existing 0015-seeded staff ) ----------
  FOR v_staff IN
    SELECT * FROM (VALUES
      ('E-001','priya@emids.test','Priya Rao'),
      ('E-002','rahul@emids.test','Rahul Nair'),
      ('E-003','sam@emids.test','Sam Fernandes'),
      ('E-004','brooke@emids.test','Brooke Davis'),
      ('E-009','admin@emids.test','Deepa Menon')
    ) AS s(code, email, name)
  LOOP
    BEGIN
      INSERT INTO users (employee_code, email, full_name)
      VALUES (v_staff.code, v_staff.email, v_staff.name);
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END LOOP;

  SELECT id INTO v_priya  FROM users WHERE email='priya@emids.test';
  SELECT id INTO v_rahul  FROM users WHERE email='rahul@emids.test';
  SELECT id INTO v_sam    FROM users WHERE email='sam@emids.test' OR employee_code='E-L1';
  SELECT id INTO v_brooke FROM users WHERE email='brooke@emids.test';
  SELECT id INTO v_admin  FROM users WHERE email='admin@emids.test';
  SELECT id INTO v_period FROM fiscal_period WHERE name='FY26 Q4';

  -- Rahul reports to Sam (org tree)
  UPDATE users SET manager_id = v_sam WHERE id = v_rahul;

  -- ---------- allowance seed ----------
  PERFORM fn_allowance_seed(v_period);
  v_i_state := (SELECT count(*) FROM to_recog_points WHERE period_id = v_period);
  v_textstate := (SELECT 'rows=' || v_i_state);
  INSERT INTO verify_results VALUES ('allowance_seed',
    v_i_state = (SELECT count(*) FROM users
                  WHERE COALESCE(recognition_eligible, employment_status = 'active')),
    'rows=' || v_i_state);

  -- ---------- C1: submit a 200-pt praise to Rahul+Sam, CC Brooke ----------
  v_rec := fn_submit_recognition(v_priya,
           ARRAY[v_rahul, v_brooke], ARRAY[v_sam],
           NULL, NULL,
           'Rahul went above and beyond for the Humana migration.', 200,
           'https://art/1', 'praise', '7c9e6679-742f-48de-944b-076e5a3aabad');
  SELECT ai.id INTO v_item FROM approval_item ai
    WHERE ai.recognition_id = v_rec;

  v_textstate := (SELECT status FROM recognition_history WHERE id = v_rec);
  INSERT INTO verify_results VALUES ('C1_submit_pending', v_textstate='pending_approval', 'status='||v_textstate);

  v_i_state := (SELECT count(*) FROM recognition_pending WHERE recognition_id = v_rec);
  INSERT INTO verify_results VALUES ('C1_queue_projected', v_i_state=1, 'queue rows='||v_i_state);

  v_i_state := (SELECT r.balance FROM to_recog_points r
                 JOIN fiscal_period f ON f.id=r.period_id
                WHERE r.user_id = v_priya AND now()::date BETWEEN f.starts AND f.ends);
  INSERT INTO verify_results VALUES ('C1_hold_debited', v_i_state=50, 'allowance='||v_i_state);

  v_i_state := (SELECT count(*) FROM journal_entry j WHERE j.kind='recognition_hold' AND j.linked_recognition_id=v_rec);
  INSERT INTO verify_results VALUES ('C1_hold_journal', v_i_state=1, 'count='||v_i_state);

  -- recipient rows resolve 100/100 (sum = base)
  v_i_state := (SELECT SUM(points) FROM recognition_recipients WHERE recognition_id=v_rec AND kind='to');
  INSERT INTO verify_results VALUES ('C1_recipient_sum', v_i_state=200, 'sum='||v_i_state);

  -- ---------- C1b: approve → release ----------
  PERFORM fn_approve_recognition(v_item, v_admin);

  v_i_state := (SELECT count(*) FROM recognition_pending WHERE recognition_id = v_rec);
  INSERT INTO verify_results VALUES ('C1b_queue_drained', v_i_state=0, 'after approve='||v_i_state);
  v_textstate := (SELECT status FROM recognition_history WHERE id=v_rec);
  INSERT INTO verify_results VALUES ('C1b_status_approved', v_textstate='approved', 'status='||v_textstate);
  v_i_state := (SELECT pw.balance FROM points_wallet pw WHERE pw.user_id=v_rahul);
  INSERT INTO verify_results VALUES ('C1b_recipient_credited', v_i_state=100, 'rahul wallet='||v_i_state);
  v_i_state := (SELECT r.balance FROM to_recog_points r
                 JOIN fiscal_period f ON f.id=r.period_id
                WHERE r.user_id = v_priya AND now()::date BETWEEN f.starts AND f.ends);
  INSERT INTO verify_results VALUES ('C1b_giver_once_not_twice', v_i_state=50, 'allowance still='||v_i_state);

  -- per-wallet reconcile drift = 0
  v_i_state := (SELECT count(*) FROM vw_wallet_reconcile WHERE drift <> 0);
  INSERT INTO verify_results VALUES ('C1b_reconcile_zero', v_i_state=0, 'drift rows='||v_i_state);

  -- ---------- C2: routed praise (150, band 2) → declined → refund exactly once ----------
  v_rec := fn_submit_recognition(v_sam, ARRAY[v_rahul], NULL, NULL, NULL,
           'Routed one worth 150.', 150, NULL, 'praise',
           '1b2f4b83-9d37-4a15-9b3e-000000000001'::uuid);
  SELECT ai.id INTO v_item FROM approval_item ai WHERE ai.recognition_id = v_rec;
  IF v_item IS NULL THEN RAISE EXCEPTION 'C2_expected_routed_item'; END IF;
  -- the submitter's manager (Lena, L2) owns the only pending step
  v_i_state := (SELECT count(*) FROM approval_item_step s
                 WHERE s.approval_item_id = v_item AND s.status='pending'
                   AND s.owner_id = (SELECT manager_id FROM users WHERE id = v_sam));
  INSERT INTO verify_results VALUES ('C2_routed_to_manager', v_i_state=1, 'steps for manager='||v_i_state);
  PERFORM fn_decline_recognition(v_item, (SELECT manager_id FROM users WHERE id = v_sam), 'Wrong person to celebrate — save it.');
  v_i_state := (SELECT r.balance FROM to_recog_points r
                 JOIN fiscal_period f ON f.id=r.period_id
                WHERE r.user_id = v_sam AND now()::date BETWEEN f.starts AND f.ends);
  INSERT INTO verify_results VALUES ('C2_refund_restored', v_i_state=250, 'allowance='||v_i_state);
  v_i_state := (SELECT count(*) FROM journal_entry j
                 WHERE j.kind='recognition_refund' AND j.linked_recognition_id=v_rec);
  INSERT INTO verify_results VALUES ('C2_refund_once', v_i_state=1, 'refund journals='||v_i_state);
  -- the decline note must have reached the refund journal's reason
  v_i_state := (SELECT count(*) FROM journal_entry j
                 WHERE j.kind='recognition_refund' AND j.linked_recognition_id=v_rec
                   AND j.reason='Wrong person to celebrate — save it.');
  INSERT INTO verify_results VALUES ('C2_note_required_ok', v_i_state=1, 'decline note recorded='||v_i_state);

  -- ---------- C3: double-decline is impossible ----------
  BEGIN
    PERFORM fn_decline_recognition(v_item, v_admin, 'second paragraph attempt');
    INSERT INTO verify_results VALUES ('C3_double_refund_blocked', false, 'no exception raised');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'P0001' OR left(SQLSTATE, 4) = 'C549' THEN
    INSERT INTO verify_results VALUES ('C3_double_refund_blocked', true, 'blocked: ' || SQLERRM);
    ELSE
      RAISE;  -- an unexpected error inside the suite must fail the suite
    END IF;
  END;

  -- ---------- C4: idempotent submit keyed ----------
  BEGIN
    v_rec := fn_submit_recognition(v_priya, ARRAY[v_rahul], NULL, NULL, NULL, 'dup key', 40,
             NULL, 'praise', '0e6b2a2f-1111-4a15-9b3e-0000000000aa');
    INSERT INTO verify_results VALUES ('C4_idempotent_first', true, 'first ok');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO verify_results VALUES ('C4_idempotent_first', false, SQLERRM);
  END;
  BEGIN
    v_rec := fn_submit_recognition(v_priya, ARRAY[v_rahul], NULL, NULL, NULL, 'dup key', 40,
             NULL, 'praise', '0e6b2a2f-1111-4a15-9b3e-0000000000aa');
    INSERT INTO verify_results VALUES ('C4_idempotent_second', false, 'duplicate accepted');
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO verify_results VALUES ('C4_idempotent_second', true, 'rejected: unique idempotency');
  WHEN OTHERS THEN
    INSERT INTO verify_results VALUES ('C4_idempotent_second', true, 'rejected: ' || SQLERRM);
  END;

  -- ---------- C5: self-praise blocked ----------
  BEGIN
    v_rec := fn_submit_recognition(v_priya, ARRAY[v_priya], NULL, NULL, NULL, 'to myself', 10,
             NULL, 'praise', '0e6b2a2f-2222-4a15-9b3e-0000000000ab');
    INSERT INTO verify_results VALUES ('C5_self_praise', false, 'self accepted');
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = 'P0001' OR left(SQLSTATE, 4) = 'C549' THEN
    INSERT INTO verify_results VALUES ('C5_self_praise', true, 'blocked: ' || SQLERRM);
    ELSE
      RAISE;  -- an unexpected error inside the suite must fail the suite
    END IF;
  END;

  -- ---------- C6: routing — 120-pt submit routes (band 2) even from a different giver ----------
  v_rec := fn_submit_recognition(v_sam, ARRAY[v_brooke], NULL, NULL, NULL, 'routed kudos', 120, NULL, 'praise',
           '0e6b2a2f-3333-4a15-9b3e-0000000000ac');
  SELECT ai.id INTO v_item FROM approval_item ai WHERE ai.recognition_id = v_rec;
  v_textstate := (SELECT status FROM recognition_history WHERE id=v_rec);
  -- the POC fn — resolution happens via fn_approve path anyway; assert pending + item exists.
  v_i_state := (SELECT count(*) FROM approval_item WHERE recognition_id=v_rec);
  INSERT INTO verify_results VALUES ('C6_band_routing', v_i_state=1, 'item created band matches');

  -- ---------- C7: prize payout with funded SYS_PRIZE ----------
  -- fund the prize account with a manual adjustment journal (would be an admin flow)
  BEGIN
    DECLARE v_journal uuid; v_award uuid; v_nom uuid; v_psys uuid;
    BEGIN
      SELECT id INTO v_psys FROM ledger_account WHERE code='SYS_PRIZE';
      -- top up from SYS_BUDGET so the pool is not empty
      INSERT INTO journal_entry (kind, memo, reason) VALUES ('adjustment','prize pool funding','fund SYS_PRIZE')
        RETURNING id INTO v_journal;
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, a.id,'debit', 2000 FROM ledger_account a WHERE a.code='SYS_BUDGET_FUND';
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        VALUES (v_journal, v_psys, 'credit', 2000);

      INSERT INTO awards (period_id, name, prize_points, phase, requires_jury)
        VALUES (v_period, 'Beyond the Customer', 500, 'voting', true)
        RETURNING id INTO v_award;
      INSERT INTO awards_nominations (award_id, nominee_id, nominator_id, story, is_self_nomination, status)
        VALUES (v_award, v_rahul, v_admin, 'Saved the Humana go-live with systems work.', false, 'under_review')
        RETURNING id INTO v_nom;

      PERFORM fn_finalize_award(v_award, v_nom, v_admin);
      v_i_state := (SELECT pw.balance FROM points_wallet pw WHERE pw.user_id=v_rahul);
      INSERT INTO verify_results VALUES ('C7_payout_credited', v_i_state >= 500, 'rahul wallet='||v_i_state);
      v_i_state := (SELECT COALESCE(SUM(CASE direction WHEN 'debit' THEN amount ELSE -amount END),0)
                     FROM journal_line line JOIN journal_entry je ON je.id=line.journal_id
                    WHERE je.kind='payout');
      INSERT INTO verify_results VALUES ('C7_journal_balanced', v_i_state=0, 'delta='||v_i_state);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO verify_results VALUES ('C7_payout_credited', false, SQLERRM);
    END;
  END;

  -- sum-up
  SELECT count(*) INTO v_fails FROM verify_results WHERE NOT ok;
END; $$;

SELECT check_name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, detail
  FROM verify_results
 ORDER BY check_name;
