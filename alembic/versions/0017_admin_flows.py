"""0017_admin_flows — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0017_admin_flows"
down_revision = "0016_step_level"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    -- notification + outbox entry in one call; dedupe makes replays idempotent
    CREATE OR REPLACE FUNCTION fn_notify(
      p_user uuid, p_type notification_type, p_channel notification_channel,
      p_payload jsonb, p_dedupe text DEFAULT NULL)
    RETURNS void AS $$
    BEGIN
      IF p_user IS NULL THEN RETURN; END IF;
      INSERT INTO notification (user_id, type, channel, payload, delivery_status, dedupe_key)
      VALUES (p_user, p_type, p_channel, p_payload, 'queued', p_dedupe)
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
      INSERT INTO outbox_event (aggregate, aggregate_id, event_type, payload, dedupe_key)
      VALUES ('recognition', p_user::text, 'notify.' || p_type::text, p_payload, p_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END; $$ LANGUAGE plpgsql;

    -- rule condition evaluator: {"attr","op","value"} against a context
    CREATE OR REPLACE FUNCTION fn_rule_matches(p_condition jsonb, p_ctx jsonb)
    RETURNS boolean AS $$
    DECLARE v_attr text; v_op text; v_value jsonb;
    BEGIN
      IF p_condition IS NULL OR p_condition = '{}'::jsonb THEN RETURN true; END IF;
      v_attr  := p_condition->>'attr';
      v_op    := p_condition->>'op';
      v_value := p_condition->'value';
      RETURN CASE
        WHEN v_attr = 'recipient_count' AND v_op = 'gt' THEN
          (p_ctx->>'recipient_count')::int > (v_value)::int
        WHEN v_attr = 'recipient_count' AND v_op = 'lt' THEN
          (p_ctx->>'recipient_count')::int < (v_value)::int
        WHEN v_attr = 'recipient_count' AND v_op = 'eq' THEN
          (p_ctx->>'recipient_count')::int = (v_value)::int
        WHEN v_attr = 'kind' AND v_op = 'eq' THEN
          p_ctx->>'kind' = (v_value)::text
        WHEN v_attr = 'value_id' AND v_op = 'eq' THEN
          p_ctx->>'value_id' IS NOT NULL AND p_ctx->>'value_id' = (v_value)::text
        ELSE false END;
    END; $$ LANGUAGE plpgsql;

    -- routing via rules only; condition pass gates matching
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
      IF NOT FOUND THEN RAISE EXCEPTION 'person_not_found'; END IF;
      IF NOT (COALESCE(v_giver.recognition_eligible, v_giver.employment_status = 'active')) THEN
        RAISE EXCEPTION 'person_inactive'; END IF;
      IF p_to_ids && ARRAY[p_from_user] THEN RAISE EXCEPTION 'self_recognition_blocked'; END IF;
      IF p_base_points < 0 OR p_base_points > 9999 THEN RAISE EXCEPTION 'points_out_of_range'; END IF;

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
          IF NOT FOUND THEN RAISE EXCEPTION 'recipient_not_found: %', v_buyer; END IF;
          IF v_user.source = 'guest' THEN RAISE EXCEPTION 'guest_cannot_receive'; END IF;
          IF NOT (COALESCE(v_user.recognition_eligible, v_user.employment_status = 'active')) THEN
            RAISE EXCEPTION 'person_inactive'; END IF;
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
            RAISE EXCEPTION 'recipient_not_found: %', v_buyer; END IF;
          INSERT INTO recognition_recipients (recognition_id, user_id, points, kind)
          VALUES (v_recognition, v_buyer, 0, 'cc');
        END LOOP;
      END IF;

      IF p_base_points = 0 THEN RETURN v_recognition; END IF;

      SELECT SUM(points) INTO v_total FROM recognition_recipients
       WHERE recognition_id = v_recognition AND kind='to';
      IF v_total <> p_base_points THEN
        RAISE EXCEPTION 'recipient_total_mismatch: % <> %', v_total, p_base_points;
      END IF;

      SELECT t.id INTO v_alloc
        FROM to_recog_points t JOIN fiscal_period f ON f.id = t.period_id
       WHERE t.user_id = p_from_user AND now()::date BETWEEN f.starts AND f.ends;
      IF v_alloc IS NULL THEN RAISE EXCEPTION 'no_allowance_for_period'; END IF;
      IF NOT EXISTS (SELECT 1 FROM to_recog_points WHERE id = v_alloc AND balance >= p_base_points) THEN
        RAISE EXCEPTION 'insufficient_points';
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
      IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: allowance'; END IF;
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, a.id, 'credit', p_base_points
          FROM ledger_account a WHERE a.code = 'SYS_PENDING' LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: SYS_PENDING'; END IF;

      v_condition_ctx := jsonb_build_object(
        'recipient_count', COALESCE(array_length(p_to_ids,1), 0),
        'kind', p_kind::text
      );
      RAISE NOTICE 'fn-submit debug: to_ids=% ctx=%', p_to_ids, v_condition_ctx;
      SELECT r.id, r.version INTO v_rule, v_version
        FROM approval_rule r
       WHERE r.kind = 'points_recognition' AND r.is_active
         AND COALESCE(r.min_points, 0) <= p_base_points
         AND COALESCE(r.max_points, 999999) >= p_base_points
         AND fn_rule_matches(r.condition, v_condition_ctx)
       ORDER BY r.priority ASC LIMIT 1;
      IF v_rule IS NULL THEN
        RAISE NOTICE 'no-route debug: ctx=% points=% base=%', v_condition_ctx, p_base_points,
          (SELECT string_agg(priority::text || ',' || COALESCE(min_points::text, '-') || '-' || COALESCE(max_points::text,'-') || ',cond=' || COALESCE(r.condition::text, 'null'), ' | ')
             FROM approval_rule r WHERE r.kind='points_recognition' AND r.is_active);
        RAISE EXCEPTION 'no_approval_route';
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
        IF v_owner IS NULL THEN RAISE EXCEPTION 'approver_unresolvable_at_step_%', v_steps.seq; END IF;
        INSERT INTO approval_item_step (approval_item_id, seq, level, owner_id, mode, sla_due, status, note)
        VALUES (v_item, v_steps.seq, v_steps.level, v_owner, v_steps.mode,
                CASE WHEN v_steps.sla_hours IS NOT NULL THEN now() + (v_steps.sla_hours || ' hours')::interval END,
                'pending', NULL);
      END LOOP;

      PERFORM fn_notify(p_from_user, 'approval_pending', 'in_app',
        jsonb_build_object('item', v_item), 'pending:' || v_item::text);
      RETURN v_recognition;
    END; $$ LANGUAGE plpgsql;

    -- approve path: also notify recipients + submitter with dedupe keys
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
        PERFORM fn_notify(v_recip.user_id, 'praise_received', 'in_app',
          jsonb_build_object('points', v_recip.points),
          'praise:' || p_recognition::text || ':' || v_recip.user_id::text);
      END LOOP;
      RETURN v_journal;
    END; $$ LANGUAGE plpgsql;

    -- admin budget change: RBAC + SoD + spent-protect + audit
    CREATE OR REPLACE FUNCTION fn_admin_set_budget(
      p_user uuid, p_period uuid, p_new_allocated int, p_actor uuid)
    RETURNS void AS $$
    DECLARE v_alloc RECORD; v_old int;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role = 'admin' AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege';
      END IF;
      IF p_user = p_actor THEN RAISE EXCEPTION 'self_admin_blocked'; END IF;
      SELECT * INTO v_alloc FROM to_recog_points
       WHERE user_id = p_user AND period_id = p_period;
      IF NOT FOUND THEN RAISE EXCEPTION 'no_allowance_for_period'; END IF;
      IF p_new_allocated < v_alloc.allocated - v_alloc.balance THEN
        RAISE EXCEPTION 'allocation_below_spent';
      END IF;
      v_old := v_alloc.allocated;
      UPDATE to_recog_points SET allocated = p_new_allocated,
        balance = balance + (p_new_allocated - v_alloc.allocated)
       WHERE user_id = p_user AND period_id = p_period;
      INSERT INTO audit_log (actor, action, entity, entity_id, before, after, at)
        VALUES (p_actor, 'budget.allocation_changed', 'to_recog_points', p_user::text,
          jsonb_build_object('allocated', v_old), jsonb_build_object('allocated', p_new_allocated), now());
    END; $$ LANGUAGE plpgsql;

    -- leaver: refund their open holds, cancel items, skip their pending steps (M22)
    CREATE OR REPLACE FUNCTION fn_deactivate_person(p_user uuid, p_actor uuid, p_reason text)
    RETURNS void AS $$
    DECLARE v_item RECORD; v_hold uuid; v_alloc uuid; v_alloc_owner uuid; v_journal uuid; v_amount int; v_acct uuid;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM role_assignment
                      WHERE user_id = p_actor AND role IN ('admin','hr') AND revoked_at IS NULL) THEN
        RAISE EXCEPTION 'insufficient_privilege';
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
            RAISE EXCEPTION 'double_refund_blocked';
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

    -- drain the outbox: relay job's POC, returns rows marked sent
    CREATE OR REPLACE FUNCTION fn_relay_outbox()
    RETURNS int AS $$
    DECLARE v_count int;
    BEGIN
      UPDATE outbox_event e
         SET attempts = attempts + 1, sent_at = CASE WHEN e.payload ? 'user_id' THEN now() ELSE e.sent_at END,
             status = 'sent', relayed_at = now()
       WHERE e.status = 'pending';
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RETURN v_count;
    END; $$ LANGUAGE plpgsql""")

def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_relay_outbox;
    DROP FUNCTION IF EXISTS fn_deactivate_person;
    DROP FUNCTION IF EXISTS fn_admin_set_budget;
    DROP FUNCTION IF EXISTS fn_notify;
    DROP FUNCTION IF EXISTS fn_rule_matches;
    DROP FUNCTION IF EXISTS fn_release_recognition;
    DROP FUNCTION IF EXISTS fn_submit_recognition""")
