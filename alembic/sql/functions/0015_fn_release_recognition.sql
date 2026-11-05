-- internal: release a pending hold to the recipients (approve path; also used
-- by auto bands). From 0015_staff_fn.
CREATE OR REPLACE FUNCTION fn_release_recognition(p_recognition uuid, p_decider uuid, p_memo text)
RETURNS uuid AS $$
DECLARE v_hold uuid; v_journal uuid; v_recip RECORD; v_wallet uuid; v_account uuid; v_amount int;
BEGIN
  SELECT id INTO v_hold FROM journal_entry j
   WHERE j.kind='recognition_hold' AND j.linked_recognition_id = p_recognition AND j.status='posted';
  IF v_hold IS NULL THEN RAISE EXCEPTION 'hold_journal_missing'; END IF;

  SELECT base_points INTO v_amount FROM recognition_history WHERE id = p_recognition;

  INSERT INTO journal_entry (kind, memo, linked_recognition_id, reverses, reason)
    VALUES ('recognition_release', p_memo, p_recognition, v_hold, 'approve')
    RETURNING id INTO v_journal;

  INSERT INTO journal_line (journal_id, account_id, direction, amount)
    SELECT v_journal, a.id, 'debit', v_amount
      FROM ledger_account a WHERE a.code='SYS_PENDING' LIMIT 1;

  FOR v_recip IN
    SELECT rr.user_id, rr.points FROM recognition_recipients rr
     WHERE rr.recognition_id = p_recognition AND rr.kind='to'
     ORDER BY rr.user_id
  LOOP
    SELECT pw.id INTO v_wallet FROM points_wallet pw WHERE pw.user_id = v_recip.user_id;
    IF v_wallet IS NULL THEN
      INSERT INTO points_wallet (user_id) VALUES (v_recip.user_id) RETURNING id INTO v_wallet;
    END IF;
    INSERT INTO ledger_account (code, kind, wallet_id)
      VALUES ('wallet:' || v_recip.user_id::text, 'user_wallet', v_wallet)
      ON CONFLICT (code) DO UPDATE SET wallet_id = EXCLUDED.wallet_id
      RETURNING id INTO v_account;
    INSERT INTO ledger (journal_id, points_wallet_id, kind, amount, label, user_id)
      VALUES (v_journal, v_wallet, 'recognition_release', v_recip.points,
              'recognition received', v_recip.user_id);
    INSERT INTO journal_line (journal_id, account_id, direction, amount)
      VALUES (v_journal, v_account, 'credit', v_recip.points);
  END LOOP;
  RETURN v_journal;
END; $$ LANGUAGE plpgsql;
