-- fn_nomination_admin_decide — the admin's FINAL verdict (0034, the last link
-- of the nomination pipeline: DM nominates → DH endorses → ADMIN awards).
-- Guards: the row must sit in the admin lane (review_stage='admin' — the DH
-- approve moved it there in fn_nomination_decide); anything else is the
-- C5495 dynamic raise ('item_already_decided' → 409). The judging window does
-- not gate the admin lane: the DH window expired but the final call still
-- lands.
-- approve → status='result', review_stage='done' AND THE WALLET CREDIT: the
--   award's prize_points move to the NOMINEE'S wallet, mirroring the
--   seed/demo payout (and fn_finalize_award's contract):
--     points_wallet created if the winner has none,
--     ledger_account 'wallet:<uuid>' upserted,
--     journal_entry kind='payout' (linked_award_id, created_by = the admin),
--     journal_lines debit SYS_PRIZE / credit the wallet account,
--     ledger row (kind 'payout') moves the wallet balance.
--   The stage gate above makes the credit idempotent: a second verdict on
--   the same nomination can never double-pay.
-- decline → status='not_selected', review_stage='done', decision_note = the
--   optional reason (no required-note rule here — the admin's call is
--   final and does not return to the nominator).
CREATE OR REPLACE FUNCTION fn_nomination_admin_decide(
      p_nomination uuid, p_decider uuid, p_approve boolean,
      p_note text DEFAULT NULL)
RETURNS void AS $$
DECLARE v_nom RECORD; v_award RECORD; v_wallet uuid; v_account uuid;
        v_journal uuid; v_prize int;
BEGIN
  SELECT * INTO v_nom FROM awards_nominations WHERE id = p_nomination FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found' USING ERRCODE = 'C549M';
  END IF;

  IF v_nom.review_stage <> 'admin' THEN
    RAISE EXCEPTION 'item_already_decided' USING ERRCODE = 'C5495';
  END IF;

  IF NOT p_approve THEN
    UPDATE awards_nominations
       SET status = 'not_selected'::nomination_status,
           review_stage = 'done',
           decided_by = p_decider,
           decided_at = now(),
           decision_note = NULLIF(BTRIM(COALESCE(p_note, '')), '')
     WHERE id = p_nomination;
    RETURN;
  END IF;

  SELECT * INTO v_award FROM awards WHERE id = v_nom.award_id;
  v_prize := v_award.prize_points;

  UPDATE awards_nominations
     SET status = 'result'::nomination_status,
         review_stage = 'done',
         decided_by = p_decider,
         decided_at = now()
   WHERE id = p_nomination;

  -- the payout (winner = the NOMINEE)
  SELECT pw.id INTO v_wallet FROM points_wallet pw WHERE pw.user_id = v_nom.nominee_id;
  IF v_wallet IS NULL THEN
    INSERT INTO points_wallet (user_id) VALUES (v_nom.nominee_id)
      RETURNING id INTO v_wallet;
  END IF;
  INSERT INTO ledger_account (code, kind, wallet_id)
    VALUES ('wallet:' || v_nom.nominee_id::text, 'user_wallet', v_wallet)
    ON CONFLICT (code) DO UPDATE SET wallet_id = EXCLUDED.wallet_id
    RETURNING id INTO v_account;

  INSERT INTO journal_entry (kind, memo, linked_award_id, created_by)
    VALUES ('payout', 'award prize: ' || v_award.name, v_award.id, p_decider)
    RETURNING id INTO v_journal;
  INSERT INTO journal_line (journal_id, account_id, direction, amount)
    SELECT v_journal, id, 'debit', v_prize FROM ledger_account
     WHERE code = 'SYS_PRIZE' LIMIT 1;
  INSERT INTO journal_line (journal_id, account_id, direction, amount)
    VALUES (v_journal, v_account, 'credit', v_prize);
  INSERT INTO ledger (journal_id, points_wallet_id, kind, amount, label, user_id)
    VALUES (v_journal, v_wallet, 'payout', v_prize,
            'award prize: ' || v_award.name, v_nom.nominee_id);
END; $$ LANGUAGE plpgsql;
