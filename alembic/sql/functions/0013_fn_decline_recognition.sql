CREATE OR REPLACE FUNCTION fn_decline_recognition(p_item uuid, p_decider uuid, p_note text)
    RETURNS void AS $$
    DECLARE v_item RECORD; v_hold uuid; v_journal uuid; v_rec uuid;
            v_alloc uuid; v_alloc_owner uuid; v_allowance_account uuid; v_amount int;
    BEGIN
      SELECT * INTO v_item FROM approval_item WHERE id = p_item FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
      IF v_item.status <> 'pending' THEN RAISE EXCEPTION 'item_already_%', v_item.status; END IF;
      IF p_note IS NULL OR char_length(p_note) = 0 THEN RAISE EXCEPTION 'decline_note_required'; END IF;

      SELECT recognition_id INTO v_rec FROM approval_item WHERE id = p_item;
      SELECT j.id INTO v_hold FROM journal_entry j
       WHERE j.kind='recognition_hold' AND j.linked_recognition_id = v_rec;
      IF v_hold IS NULL THEN RAISE EXCEPTION 'hold_journal_missing'; END IF;

      -- exactly-once: another refund for this hold already posted?
      IF EXISTS (SELECT 1 FROM journal_entry j WHERE j.reverses = v_hold AND j.status='posted') THEN
        RAISE EXCEPTION 'double_refund_blocked';
      END IF;
      -- refund destination resolved from the HOLD's debit target lines (NEVER "current period")
      SELECT l.to_recog_points_id, l.amount * -1, t.user_id INTO v_alloc, v_amount, v_alloc_owner
        FROM ledger l JOIN to_recog_points t ON t.id = l.to_recog_points_id
       WHERE l.journal_id = v_hold AND l.to_recog_points_id IS NOT NULL LIMIT 1;
      IF v_alloc IS NULL THEN RAISE EXCEPTION 'hold_lines_missing'; END IF;

      SELECT la.id INTO v_allowance_account FROM ledger_account la
       WHERE la.allowance_id = v_alloc LIMIT 1;

      INSERT INTO journal_entry (kind, memo, linked_recognition_id, reverses, reason)
        VALUES ('recognition_refund', 'approval refused', v_rec, v_hold, p_note)
        RETURNING id INTO v_journal;

      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, a.id, 'debit', v_amount
          FROM ledger_account a WHERE a.code='SYS_PENDING' LIMIT 1;

      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        VALUES (v_journal, v_allowance_account, 'credit', v_amount);
      INSERT INTO ledger (journal_id, to_recog_points_id, kind, amount, label, user_id)
        VALUES (v_journal, v_alloc, 'recognition_refund', +v_amount,
                'recognition refunded', v_alloc_owner);

      UPDATE approval_item SET status='declined', decided_by=p_decider, decided_at=now()
       WHERE id = p_item;
      UPDATE recognition_history SET status='declined' WHERE id = v_rec;
    END; $$ LANGUAGE plpgsql
