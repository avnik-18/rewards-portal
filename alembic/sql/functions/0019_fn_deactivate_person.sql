CREATE OR REPLACE FUNCTION fn_deactivate_person(p_user uuid, p_actor uuid, p_reason text)
    RETURNS void AS $$
    DECLARE v_item RECORD; v_hold uuid; v_alloc uuid; v_alloc_owner uuid; v_journal uuid; v_amount int; v_acct uuid;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role IN ('admin','hr') AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = 'C549Q';
      END IF;
      UPDATE users SET employment_status = 'separated' WHERE id = p_user;
      FOR v_item IN
        SELECT ai.id, ai.recognition_id FROM approval_item ai
         WHERE ai.submitter_id = p_user AND ai.status = 'pending'
      LOOP
        SELECT j.id INTO v_hold FROM journal_entry j
         WHERE j.kind='recognition_hold' AND j.linked_recognition_id = v_item.recognition_id
           AND j.status='posted'
         ORDER BY j.created_at DESC LIMIT 1;
        IF v_hold IS NOT NULL THEN
          SELECT l.to_recog_points_id, l.amount * -1, t.user_id INTO v_alloc, v_amount, v_alloc_owner
            FROM ledger l JOIN to_recog_points t ON t.id = l.to_recog_points_id
           WHERE l.journal_id = v_hold AND l.to_recog_points_id IS NOT NULL LIMIT 1;
          IF EXISTS (SELECT 1 FROM journal_entry j WHERE j.reverses = v_hold AND j.status='posted') THEN
            RAISE EXCEPTION 'double_refund_blocked' USING ERRCODE = 'C5493';
          END IF;
          SELECT a.id INTO v_acct FROM ledger_account a WHERE a.allowance_id = v_alloc LIMIT 1;
          INSERT INTO journal_entry (kind, memo, linked_recognition_id, reverses, reason)
            VALUES ('deactiv_refund', 'leaver refund', v_item.recognition_id, v_hold, p_reason)
            RETURNING id INTO v_journal;
          INSERT INTO journal_line (journal_id, account_id, direction, amount)
            SELECT v_journal, a.id, 'debit', v_amount FROM ledger_account a WHERE a.code='SYS_PENDING' LIMIT 1;
          INSERT INTO journal_line (journal_id, account_id, direction, amount)
            VALUES (v_journal, v_acct, 'credit', v_amount);
          INSERT INTO ledger (journal_id, to_recog_points_id, kind, amount, label, user_id)
            VALUES (v_journal, v_alloc, 'deactiv_refund', v_amount, 'leaver refund', v_alloc_owner);
          UPDATE recognition_history SET status='cancelled' WHERE id = v_item.recognition_id;
          UPDATE approval_item SET status='cancelled', decided_by=p_actor, decided_at=now()
           WHERE id = v_item.id;
        END IF;
      END LOOP;
      -- steps they owned as approver: skip with a note (reassignment is phase-2)
      UPDATE approval_item_step SET status='skipped', decided_by=p_actor, decided_at=now(),
        note = 'owner departed: ' || coalesce(p_reason,'')
       WHERE status='pending' AND owner_id = p_user;
      INSERT INTO audit_log (actor, action, entity, entity_id, after, at)
        VALUES (p_actor, 'person.deactivated', 'users', p_user::text,
          jsonb_build_object('status','separated','reason',p_reason), now());
    END; $$ LANGUAGE plpgsql;
