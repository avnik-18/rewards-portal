"""0013_fn_flows — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0013_fn_flows"
down_revision = "0012_seed"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    -- seed every eligible user for a period: allowance row + wallet account + journal
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

    -- approve: release journal — D SYS_PENDING, C each recipient wallet; one statement per wallet set
    CREATE OR REPLACE FUNCTION fn_approve_recognition(p_item uuid, p_decider uuid)
    RETURNS void AS $$
    DECLARE v_item RECORD; v_hold uuid; v_journal uuid; v_rec uuid;
            v_recip RECORD; v_wallet uuid; v_account uuid;
    BEGIN
      SELECT * INTO v_item FROM approval_item WHERE id = p_item FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
      IF v_item.status <> 'pending' THEN RAISE EXCEPTION 'item_already_%', v_item.status; END IF;
      v_rec := v_item.recognition_id;
      PERFORM 1 FROM approval_item WHERE id = v_item.id FOR UPDATE;
      SELECT j.id INTO v_hold FROM journal_entry j
       WHERE j.kind='recognition_hold' AND j.linked_recognition_id = v_item.recognition_id;
      IF v_hold IS NULL THEN RAISE EXCEPTION 'hold_journal_missing'; END IF;

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

    -- decline/cancel: refund journal — MUST reverse the hold (exactly-once guard keyed here)
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
    END; $$ LANGUAGE plpgsql""")

def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_decline_recognition;
    DROP FUNCTION IF EXISTS fn_approve_recognition;
    DROP FUNCTION IF EXISTS fn_allowance_seed""")
