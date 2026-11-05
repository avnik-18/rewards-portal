CREATE OR REPLACE FUNCTION fn_allowance_seed(p_period uuid)
    RETURNS int AS $$
    DECLARE v_journal uuid; v_row RECORD; v_alloc uuid; v_budget uuid;
            v_account uuid; v_alloc_count int := 0; v_policy RECORD;
    BEGIN
      SELECT quarterly_allowance INTO v_policy FROM budget_policy
       WHERE grants='all' AND effective_to IS NULL ORDER BY id DESC LIMIT 1;
      IF v_policy IS NULL THEN RAISE EXCEPTION 'no_budget_policy'; END IF;

      SELECT id INTO v_budget FROM ledger_account WHERE code='SYS_BUDGET_FUND' LIMIT 1;
      IF v_budget IS NULL THEN RAISE EXCEPTION 'account_not_found: SYS_BUDGET_FUND'; END IF;

      FOR v_row IN
        SELECT u.id FROM users u
         WHERE COALESCE(u.recognition_eligible, u.employment_status = 'active')
           AND NOT EXISTS (
             SELECT 1 FROM to_recog_points t WHERE t.user_id = u.id AND t.period_id = p_period)
      LOOP
        INSERT INTO to_recog_points (user_id, period_id, allocated, balance)
          VALUES (v_row.id, p_period, v_policy.quarterly_allowance, 0)
          RETURNING id INTO v_alloc;

        INSERT INTO ledger_account (code, kind, allowance_id)
          VALUES ('allow:' || v_row.id::text, 'user_wallet', v_alloc)
          ON CONFLICT (code) DO UPDATE SET allowance_id = EXCLUDED.allowance_id
          RETURNING id INTO v_account;

        INSERT INTO journal_entry (kind, memo, linked_user_id, reason)
          VALUES ('allowance_seed', 'quarterly allowance', v_row.id, 'seed')
          RETURNING id INTO v_journal;
        INSERT INTO journal_line (journal_id, account_id, direction, amount)
          VALUES (v_journal, v_budget, 'debit', v_policy.quarterly_allowance),
                 (v_journal, v_account, 'credit', v_policy.quarterly_allowance);
        INSERT INTO ledger (journal_id, to_recog_points_id, kind, amount, label, user_id)
          VALUES (v_journal, v_alloc, 'allowance_seed', +v_policy.quarterly_allowance,
                  'quarterly allowance', v_row.id);
        v_alloc_count := v_alloc_count + 1;
      END LOOP;
      RETURN v_alloc_count;
    END; $$ LANGUAGE plpgsql;
