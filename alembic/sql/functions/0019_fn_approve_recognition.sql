CREATE OR REPLACE FUNCTION fn_approve_recognition(p_item uuid, p_decider uuid)
    RETURNS void AS $$
    DECLARE v_item RECORD; v_hold uuid; v_journal uuid; v_rec uuid;
            v_recip RECORD; v_wallet uuid; v_account uuid;
    BEGIN
      SELECT * INTO v_item FROM approval_item WHERE id = p_item FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'C549M'; END IF;
      IF v_item.status <> 'pending' THEN RAISE EXCEPTION 'item_already_%', v_item.status USING ERRCODE = 'C5495'; END IF;
      v_rec := v_item.recognition_id;
      PERFORM 1 FROM approval_item WHERE id = v_item.id FOR UPDATE;
      SELECT j.id INTO v_hold FROM journal_entry j
       WHERE j.kind='recognition_hold' AND j.linked_recognition_id = v_item.recognition_id;
      IF v_hold IS NULL THEN RAISE EXCEPTION 'hold_journal_missing' USING ERRCODE = 'C549S'; END IF;

      INSERT INTO journal_entry (kind, memo, linked_recognition_id, reverses, reason)
        VALUES ('recognition_release', 'approval release', v_item.recognition_id, v_hold, 'approve')
        RETURNING id INTO v_journal;

      -- D SYS_PENDING (one amount = SUM of recipients, credit side matches line-per-recipient)
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, a.id, 'debit', (v_item.snapshot->>'base_points')::int
          FROM ledger_account a WHERE a.code='SYS_PENDING' LIMIT 1;

      FOR v_recip IN
        SELECT rr.user_id, rr.points FROM recognition_recipients rr
         WHERE rr.recognition_id = v_item.recognition_id AND rr.kind='to'
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
          VALUES (v_journal, v_wallet, 'recognition_release',
                  v_recip.points, 'recognition received', v_recip.user_id);
        INSERT INTO journal_line (journal_id, account_id, direction, amount)
          VALUES (v_journal, v_account, 'credit', v_recip.points);
      END LOOP;

      UPDATE approval_item SET status='approved', decided_by=p_decider, decided_at=now()
       WHERE id = p_item;
      UPDATE recognition_history SET status='approved' WHERE id = v_item.recognition_id;
    END; $$ LANGUAGE plpgsql;
