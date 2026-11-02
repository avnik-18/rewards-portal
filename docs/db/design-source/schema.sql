--
-- PostgreSQL database dump
--

\restrict ohuKdfJSsZr5hnEaEUipqIhUxklQHYAY1arzBsaDzR5KgXfEELMktqrfNdT42hV

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: account_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_kind AS ENUM (
    'user_wallet',
    'system'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'finance',
    'hr',
    'jury_member',
    'system'
);


--
-- Name: approval_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_kind AS ENUM (
    'points_recognition',
    'award_endorsement'
);


--
-- Name: approval_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_level AS ENUM (
    'L1',
    'L2',
    'L3',
    'FINANCE'
);


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'returned',
    'declined',
    'cancelled'
);


--
-- Name: approver_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approver_mode AS ENUM (
    'ANY',
    'ALL'
);


--
-- Name: approver_subject; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approver_subject AS ENUM (
    'submitter_manager',
    'submitter_manager_manager',
    'recipient_manager',
    'fixed_user'
);


--
-- Name: cycle_phase; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cycle_phase AS ENUM (
    'draft',
    'nominations',
    'voting',
    'result',
    'closed',
    'cancelled'
);


--
-- Name: delegation_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delegation_scope AS ENUM (
    'all',
    'finance',
    'award_endorsement'
);


--
-- Name: delivery_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_status AS ENUM (
    'queued',
    'sent',
    'failed',
    'read'
);


--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'running',
    'succeeded',
    'failed',
    'timed_out'
);


--
-- Name: journal_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.journal_direction AS ENUM (
    'debit',
    'credit'
);


--
-- Name: journal_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.journal_kind AS ENUM (
    'allowance_seed',
    'recognition_hold',
    'recognition_release',
    'recognition_refund',
    'payout',
    'grant',
    'earning',
    'milestone',
    'welcome',
    'adjustment',
    'reversal',
    'expiry',
    'deactiv_refund'
);


--
-- Name: journal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.journal_status AS ENUM (
    'posted',
    'void'
);


--
-- Name: ledger_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_kind AS ENUM (
    'allowance_seed',
    'recognition_hold',
    'recognition_release',
    'recognition_refund',
    'payout',
    'grant',
    'earning',
    'milestone',
    'welcome',
    'adjustment',
    'reversal',
    'expiry',
    'deactiv_refund'
);


--
-- Name: log_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.log_level AS ENUM (
    'debug',
    'info',
    'warn',
    'error'
);


--
-- Name: nomination_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nomination_status AS ENUM (
    'submitted',
    'endorsed',
    'under_review',
    'returned',
    'result',
    'not_selected'
);


--
-- Name: notification_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_channel AS ENUM (
    'in_app',
    'email',
    'slack'
);


--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notification_type AS ENUM (
    'praise_received',
    'approval_pending',
    'approval_decided',
    'award_updates',
    'milestone',
    'redemption',
    'admin_announcement'
);


--
-- Name: outbox_aggregate; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outbox_aggregate AS ENUM (
    'recognition',
    'approval',
    'award',
    'admin',
    'ledger'
);


--
-- Name: outbox_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.outbox_status AS ENUM (
    'pending',
    'sent',
    'failed'
);


--
-- Name: person_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.person_source AS ENUM (
    'internal',
    'guest'
);


--
-- Name: person_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.person_status AS ENUM (
    'active',
    'probation',
    'onleave',
    'paused',
    'notice',
    'separated'
);


--
-- Name: recipient_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recipient_kind AS ENUM (
    'to',
    'cc'
);


--
-- Name: recognition_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recognition_kind AS ENUM (
    'praise',
    'milestone',
    'welcome',
    'award'
);


--
-- Name: recognition_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recognition_status AS ENUM (
    'pending_approval',
    'approved',
    'declined',
    'returned',
    'cancelled'
);


--
-- Name: setting_data_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.setting_data_type AS ENUM (
    'bool',
    'int',
    'text'
);


--
-- Name: step_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.step_status AS ENUM (
    'pending',
    'approved',
    'declined',
    'returned',
    'skipped',
    'escalated'
);


--
-- Name: team_member_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.team_member_role AS ENUM (
    'lead',
    'member'
);


--
-- Name: apply_ledger_delta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_ledger_delta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE v_rc int;
    BEGIN
      IF NEW.to_recog_points_id IS NOT NULL THEN
        UPDATE to_recog_points SET balance = balance + NEW.amount
         WHERE id = NEW.to_recog_points_id;
        GET DIAGNOSTICS v_rc = ROW_COUNT;
      ELSE
        UPDATE points_wallet SET balance = balance + NEW.amount
         WHERE id = NEW.points_wallet_id;
        GET DIAGNOSTICS v_rc = ROW_COUNT;
      END IF;
      IF v_rc = 0 THEN RAISE EXCEPTION 'missing wallet row'; END IF;
      RETURN NEW;
    END; $$;


--
-- Name: coi_backstop(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.coi_backstop() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE v_item RECORD; v_sub uuid; v_recoid uuid;
    BEGIN
      SELECT submitter_id, recognition_id INTO v_sub, v_recoid
        FROM approval_item WHERE id = NEW.approval_item_id;
      IF v_sub IS NOT NULL AND NEW.status IN ('pending','approved') AND NEW.owner_id = v_sub THEN
        RAISE EXCEPTION 'coi_step_owner_is_submitter';
      END IF;
      IF v_recoid IS NOT NULL AND NEW.status IN ('pending','approved') THEN
        IF EXISTS (SELECT 1 FROM recognition_recipients
                    WHERE recognition_id = v_recoid AND user_id = NEW.owner_id AND kind = 'to') THEN
          RAISE EXCEPTION 'coi_step_owner_is_recipient';
        END IF;
      END IF;
      RETURN NEW;
    END; $$;


--
-- Name: fn_admin_set_budget(uuid, uuid, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_admin_set_budget(p_user uuid, p_period uuid, p_new_allocated integer, p_actor uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_allowance_seed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_allowance_seed(p_period uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_approve_recognition(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_approve_recognition(p_item uuid, p_decider uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_deactivate_person(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_deactivate_person(p_user uuid, p_actor uuid, p_reason text) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_decline_recognition(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_decline_recognition(p_item uuid, p_decider uuid, p_note text) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_finalize_award(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_finalize_award(p_award uuid, p_winner_nom uuid, p_decider uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE v_award RECORD; v_journal uuid; v_sys uuid; v_wallet uuid; v_pool numeric; v_nom RECORD;
    BEGIN
      SELECT * INTO v_award FROM awards WHERE id = p_award;
      IF NOT FOUND THEN RAISE EXCEPTION 'award_not_found'; END IF;
      IF v_award.phase = 'result' THEN RAISE EXCEPTION 'award_already_finalized'; END IF;
      SELECT * INTO v_nom FROM awards_nominations WHERE id = p_winner_nom;
      IF NOT FOUND OR v_nom.award_id <> p_award THEN RAISE EXCEPTION 'nomination_not_in_award'; END IF;

      SELECT id INTO v_sys FROM ledger_account WHERE code = 'SYS_PRIZE' LIMIT 1;
      IF v_sys IS NULL THEN RAISE EXCEPTION 'account_not_found: SYS_PRIZE'; END IF;

      SELECT COALESCE(SUM(CASE direction WHEN 'credit' THEN amount ELSE -amount END),0)
        INTO v_pool FROM journal_line WHERE account_id = v_sys;
      IF v_pool < v_award.prize_points THEN RAISE EXCEPTION 'prize_pool_empty'; END IF;

      SELECT pw.id INTO v_wallet FROM points_wallet pw WHERE pw.user_id = v_nom.nominee_id;
      IF v_wallet IS NULL THEN
        INSERT INTO points_wallet (user_id) VALUES (v_nom.nominee_id) RETURNING id INTO v_wallet;
      END IF;

      INSERT INTO journal_entry (kind, memo, linked_award_id)
        VALUES ('payout', 'award prize: ' || v_award.name, p_award)
        RETURNING id INTO v_journal;
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, id, 'debit', v_award.prize_points FROM ledger_account WHERE code='SYS_PRIZE' LIMIT 1;
      INSERT INTO journal_line (journal_id, account_id, direction, amount)
        SELECT v_journal, la.id, 'credit', v_award.prize_points FROM ledger_account la WHERE la.kind='user_wallet' AND la.wallet_id = v_wallet LIMIT 1;
      IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: winner wallet'; END IF;
      INSERT INTO ledger (journal_id, points_wallet_id, kind, amount, label, user_id)
        VALUES (v_journal, v_wallet, 'payout', v_award.prize_points, 'EoQ prize', v_nom.nominee_id);

      UPDATE awards SET phase='result', winner_nomination_id=p_winner_nom,
        winner_payout_points=prize_points, decided_by=p_decider, decided_at=now()
       WHERE id = p_award;
      UPDATE awards_nominations SET status='result', decided_by=p_decider, decided_at=now()
       WHERE id = p_winner_nom;
    END; $$;


--
-- Name: fn_item_decide(uuid, uuid, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_item_decide(p_item uuid, p_decider uuid, p_approve boolean, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    DECLARE v_item RECORD; v_pending smallint; v_rec uuid;
    BEGIN
      SELECT * INTO v_item FROM approval_item WHERE id = p_item FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'item_not_found'; END IF;
      IF v_item.status <> 'pending' THEN RAISE EXCEPTION 'item_already_%', v_item.status; END IF;

      SELECT min(seq) INTO v_pending FROM approval_item_step
       WHERE approval_item_id = p_item AND status = 'pending'
         AND owner_id = p_decider;
      IF v_pending IS NULL THEN RAISE EXCEPTION 'not_pending_for_decider'; END IF;

      IF NOT p_approve THEN
        IF p_note IS NULL OR char_length(p_note) = 0 THEN RAISE EXCEPTION 'decline_note_required'; END IF;
        UPDATE approval_item_step
           SET status='declined', decided_by=p_decider, decided_at=now(), note=p_note
         WHERE approval_item_id = p_item AND seq = v_pending AND owner_id = p_decider
           AND status='pending';

        v_rec := v_item.recognition_id;
        PERFORM fn_decline_recognition(p_item, p_decider, p_note);
        UPDATE approval_item_step SET status='skipped', decided_by=p_decider, decided_at=now(), note=p_note
         WHERE approval_item_id = p_item AND status='pending';
        RETURN;
      END IF;

      UPDATE approval_item_step
         SET status='approved', decided_by=p_decider, decided_at=now(), note=p_note
       WHERE approval_item_id = p_item AND seq = v_pending AND owner_id = p_decider
         AND status='pending';

      IF NOT EXISTS (SELECT 1 FROM approval_item_step
                      WHERE approval_item_id = p_item AND status='pending') THEN
        PERFORM fn_approve_recognition(p_item, p_decider);
        UPDATE approval_item_step SET status='skipped', note='any-mode remainder'  -- tidy ANY chain
         WHERE approval_item_id = p_item AND status='pending' AND seq > v_pending;
      END IF;
    END; $$;


--
-- Name: fn_notify(uuid, public.notification_type, public.notification_channel, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify(p_user uuid, p_type public.notification_type, p_channel public.notification_channel, p_payload jsonb, p_dedupe text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF p_user IS NULL THEN RETURN; END IF;
      INSERT INTO notification (user_id, type, channel, payload, delivery_status, dedupe_key)
      VALUES (p_user, p_type, p_channel, p_payload, 'queued', p_dedupe)
      ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
      INSERT INTO outbox_event (aggregate, aggregate_id, event_type, payload, dedupe_key)
      VALUES ('recognition', p_user::text, 'notify.' || p_type::text, p_payload, p_dedupe)
      ON CONFLICT (dedupe_key) DO NOTHING;
    END; $$;


--
-- Name: fn_relay_outbox(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_relay_outbox() RETURNS integer
    LANGUAGE plpgsql
    AS $$
    DECLARE v_count int;
    BEGIN
      UPDATE outbox_event e
         SET attempts = attempts + 1, sent_at = CASE WHEN e.payload ? 'user_id' THEN now() ELSE e.sent_at END,
             status = 'sent', relayed_at = now()
       WHERE e.status = 'pending';
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RETURN v_count;
    END; $$;


--
-- Name: fn_release_recognition(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_release_recognition(p_recognition uuid, p_decider uuid, p_memo text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_rule_matches(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_rule_matches(p_condition jsonb, p_ctx jsonb) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: fn_submit_recognition(uuid, uuid[], uuid[], uuid, uuid, text, integer, text, public.recognition_kind, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_submit_recognition(p_from_user uuid, p_to_ids uuid[], p_cc_ids uuid[] DEFAULT NULL::uuid[], p_value_id uuid DEFAULT NULL::uuid, p_template_id uuid DEFAULT NULL::uuid, p_message text DEFAULT ''::text, p_base_points integer DEFAULT 0, p_art_url text DEFAULT NULL::text, p_kind public.recognition_kind DEFAULT 'praise'::public.recognition_kind, p_idempotency_key uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
    END; $$;


--
-- Name: journal_must_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.journal_must_balance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_entry uuid; v_sum bigint;
    BEGIN
      v_entry := NEW.journal_id;
      SELECT COALESCE(SUM(CASE direction WHEN 'debit' THEN amount ELSE -amount END), 0)
        INTO v_sum FROM journal_line WHERE journal_id = v_entry;
      IF v_sum <> 0 THEN
        RAISE EXCEPTION 'journal_not_balanced: % delta', v_sum;
      END IF;
      RETURN NULL;
    END; $$;


--
-- Name: sync_pending_projection(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_pending_projection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status <> 'pending_approval') THEN
        INSERT INTO recognition_pending (recognition_id) VALUES (NEW.id)
          ON CONFLICT (recognition_id) DO NOTHING;
      ELSIF NEW.status <> 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status = 'pending_approval') THEN
        DELETE FROM recognition_pending WHERE recognition_id = NEW.id;
      END IF;
      RETURN NEW;
    END; $$;


--
-- Name: trg_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;


--
-- Name: validate_rule_condition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_rule_condition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.condition IS NULL THEN RETURN NEW; END IF;
      IF NOT (NEW.condition ? 'attr' AND NEW.condition ? 'op' AND NEW.condition ? 'value')
         OR jsonb_typeof(NEW.condition->'value') IS NULL THEN
        RAISE EXCEPTION 'invalid_condition_shape';
      END IF;
      IF NOT NEW.condition->>'attr' IN ('kind','value_id','cross_team','recipient_count')
         OR NOT NEW.condition->>'op' IN ('eq','in','gt','lt') THEN
        RAISE EXCEPTION 'invalid_condition_keys';
      END IF;
      RETURN NEW;
    END; $$;


--
-- Name: validate_setting_value(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_setting_value() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    DECLARE t text; lo int; hi int; msg text;
    BEGIN
      SELECT data_type::text, allowed_range->>'min', allowed_range->>'max'
        INTO t, lo, hi FROM admin_setting_key WHERE key = NEW.key;
      IF NOT FOUND THEN RAISE EXCEPTION 'unknown_setting: %', NEW.key; END IF;
      IF t = 'bool' AND jsonb_typeof(NEW.value) <> 'boolean' THEN
        RAISE EXCEPTION 'setting_type_mismatch: % needs bool', NEW.key;
      ELSIF t = 'int' AND jsonb_typeof(NEW.value) <> 'number' THEN
        RAISE EXCEPTION 'setting_type_mismatch: % needs int', NEW.key;
      ELSIF t = 'text' AND jsonb_typeof(NEW.value) <> 'string' THEN
        RAISE EXCEPTION 'setting_type_mismatch: % needs text', NEW.key;
      END IF;
      IF t = 'int' THEN
        IF lo IS NOT NULL AND (NEW.value)::int < lo THEN RAISE EXCEPTION 'setting_range_below: % < %', NEW.key, lo; END IF;
        IF hi IS NOT NULL AND (NEW.value)::int > hi THEN RAISE EXCEPTION 'setting_range_above: % > %', NEW.key, hi; END IF;
      END IF;
      RETURN NEW;
    END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_setting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_setting (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_setting_key; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_setting_key (
    key text NOT NULL,
    label text NOT NULL,
    data_type public.setting_data_type NOT NULL,
    allowed_range jsonb,
    is_program_policy boolean DEFAULT false NOT NULL
);


--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: approval_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.approval_kind NOT NULL,
    submitter_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    resubmitted_from uuid,
    rule_id uuid,
    rule_version integer,
    recognition_id uuid,
    nomination_id uuid,
    snapshot jsonb NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    idempotency_key uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_item_check CHECK ((((kind = 'points_recognition'::public.approval_kind) AND (recognition_id IS NOT NULL) AND (nomination_id IS NULL)) OR ((kind = 'award_endorsement'::public.approval_kind) AND (nomination_id IS NOT NULL) AND (recognition_id IS NULL)))),
    CONSTRAINT approval_item_check1 CHECK (((status = ANY (ARRAY['approved'::public.approval_status, 'returned'::public.approval_status, 'declined'::public.approval_status, 'cancelled'::public.approval_status])) = ((decided_by IS NOT NULL) AND (decided_at IS NOT NULL))))
);


--
-- Name: approval_item_step; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_item_step (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    approval_item_id uuid NOT NULL,
    seq smallint NOT NULL,
    owner_id uuid NOT NULL,
    mode public.approver_mode DEFAULT 'ANY'::public.approver_mode NOT NULL,
    sla_due timestamp with time zone,
    status public.step_status DEFAULT 'pending'::public.step_status NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    note text,
    level public.approval_level,
    CONSTRAINT approval_item_step_check CHECK (((status = ANY (ARRAY['pending'::public.step_status, 'skipped'::public.step_status, 'escalated'::public.step_status])) = (decided_at IS NULL))),
    CONSTRAINT approval_item_step_check1 CHECK (((status <> 'declined'::public.step_status) OR (note IS NOT NULL))),
    CONSTRAINT approval_item_step_seq_check CHECK ((seq >= 1))
);


--
-- Name: approval_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.approval_kind NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    condition jsonb,
    min_points integer,
    max_points integer,
    priority integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version_note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT approval_rule_check CHECK (((max_points IS NULL) OR (min_points IS NULL) OR (max_points >= min_points))),
    CONSTRAINT approval_rule_min_points_check CHECK (((min_points IS NULL) OR (min_points >= 0)))
);


--
-- Name: approval_rule_step; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_rule_step (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    seq smallint NOT NULL,
    level public.approval_level NOT NULL,
    subject public.approver_subject NOT NULL,
    fixed_user_id uuid,
    mode public.approver_mode DEFAULT 'ANY'::public.approver_mode NOT NULL,
    sla_hours integer,
    escalation_target text,
    CONSTRAINT approval_rule_step_check CHECK (((subject <> 'fixed_user'::public.approver_subject) OR (fixed_user_id IS NOT NULL))),
    CONSTRAINT approval_rule_step_check1 CHECK (((level <> 'FINANCE'::public.approval_level) OR (subject = 'fixed_user'::public.approver_subject))),
    CONSTRAINT approval_rule_step_escalation_target_check CHECK ((escalation_target = ANY (ARRAY['fp_manager'::text, 'fixed_sys_admin'::text]))),
    CONSTRAINT approval_rule_step_seq_check CHECK ((seq >= 1))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor uuid,
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text,
    before jsonb,
    after jsonb,
    at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: awards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.awards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    value_id uuid,
    prize_points integer NOT NULL,
    max_nominations_per_nominator integer DEFAULT 1 NOT NULL,
    requires_jury boolean DEFAULT true NOT NULL,
    phase public.cycle_phase DEFAULT 'draft'::public.cycle_phase NOT NULL,
    nominations_end date,
    voting_end date,
    winner_nomination_id uuid,
    winner_payout_points integer,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT awards_check CHECK (((voting_end IS NULL) OR (nominations_end IS NULL) OR (voting_end >= nominations_end))),
    CONSTRAINT awards_check1 CHECK ((((winner_nomination_id IS NULL) AND (decided_by IS NULL)) OR (decided_at IS NOT NULL))),
    CONSTRAINT awards_max_nominations_per_nominator_check CHECK ((max_nominations_per_nominator >= 1)),
    CONSTRAINT awards_prize_points_check CHECK ((prize_points > 0)),
    CONSTRAINT awards_winner_payout_points_check CHECK (((winner_payout_points IS NULL) OR (winner_payout_points > 0)))
);


--
-- Name: awards_nominations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.awards_nominations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    award_id uuid NOT NULL,
    nominee_id uuid NOT NULL,
    nominator_id uuid NOT NULL,
    story text DEFAULT ''::text NOT NULL,
    is_self_nomination boolean DEFAULT false NOT NULL,
    shortlisted boolean,
    status public.nomination_status DEFAULT 'submitted'::public.nomination_status NOT NULL,
    flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    decided_by uuid,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT awards_nominations_check CHECK ((is_self_nomination = (nominator_id = nominee_id))),
    CONSTRAINT awards_nominations_story_check CHECK ((char_length(story) >= 0))
);


--
-- Name: ballot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ballot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nomination_id uuid NOT NULL,
    juror_id uuid NOT NULL,
    score smallint NOT NULL,
    note text,
    voted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ballot_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: budget_policy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_policy (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    grants text NOT NULL,
    role_band_employee_id uuid,
    quarterly_allowance integer NOT NULL,
    recipient_cap_per_period integer,
    carry_over boolean DEFAULT false NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT budget_policy_check CHECK (((effective_to IS NULL) OR (effective_to > effective_from))),
    CONSTRAINT budget_policy_grants_check CHECK ((grants = ANY (ARRAY['all'::text, 'manager'::text, 'senior'::text, 'fixed'::text]))),
    CONSTRAINT budget_policy_quarterly_allowance_check CHECK ((quarterly_allowance > 0))
);


--
-- Name: emids_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emids_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: fiscal_period; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_period (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    starts date NOT NULL,
    ends date NOT NULL,
    CONSTRAINT fiscal_period_check CHECK ((ends > starts))
);


--
-- Name: job_run; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_run (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status public.job_status DEFAULT 'running'::public.job_status NOT NULL,
    rows_affected integer,
    error text,
    context jsonb
);


--
-- Name: journal_entry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.journal_kind NOT NULL,
    memo text,
    linked_recognition_id uuid,
    linked_award_id uuid,
    linked_user_id uuid,
    reverses uuid,
    reason text,
    status public.journal_status DEFAULT 'posted'::public.journal_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journal_entry_check CHECK ((num_nonnulls(linked_recognition_id, linked_award_id, linked_user_id) <= 1)),
    CONSTRAINT journal_entry_check1 CHECK (((status = 'posted'::public.journal_status) OR (reason IS NOT NULL)))
);


--
-- Name: journal_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_line (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    account_id uuid NOT NULL,
    direction public.journal_direction NOT NULL,
    amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT journal_line_amount_check CHECK ((amount > 0))
);


--
-- Name: jury_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jury_assignment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    award_id uuid NOT NULL,
    user_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    to_recog_points_id uuid,
    points_wallet_id uuid,
    kind public.ledger_kind NOT NULL,
    amount integer NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    user_id uuid NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_amount_check CHECK ((amount <> 0)),
    CONSTRAINT ledger_check CHECK ((num_nonnulls(to_recog_points_id, points_wallet_id) = 1))
);


--
-- Name: ledger_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_account (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    kind public.account_kind NOT NULL,
    user_id uuid,
    wallet_id uuid,
    allowance_id uuid,
    CONSTRAINT ledger_account_system_chk CHECK (((kind = 'system'::public.account_kind) = (num_nonnulls(wallet_id, allowance_id, user_id) = 0))),
    CONSTRAINT ledger_account_user_wallet_chk CHECK (((kind = 'user_wallet'::public.account_kind) = (num_nonnulls(wallet_id, allowance_id) = 1)))
);


--
-- Name: milestone_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger text NOT NULL,
    years integer DEFAULT 0 NOT NULL,
    points integer NOT NULL,
    posts_to_feed boolean DEFAULT false NOT NULL,
    awards_banner boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT milestone_rule_points_check CHECK ((points > 0)),
    CONSTRAINT milestone_rule_trigger_check CHECK ((trigger = ANY (ARRAY['anniversary'::text, 'birthday'::text]))),
    CONSTRAINT milestone_rule_years_check CHECK ((years >= 0))
);


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type public.notification_type NOT NULL,
    channel public.notification_channel DEFAULT 'in_app'::public.notification_channel NOT NULL,
    payload jsonb NOT NULL,
    delivery_status public.delivery_status DEFAULT 'queued'::public.delivery_status NOT NULL,
    dedupe_key text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outbox_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate public.outbox_aggregate NOT NULL,
    aggregate_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.outbox_status DEFAULT 'pending'::public.outbox_status NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    dedupe_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    relayed_at timestamp with time zone
);


--
-- Name: points_wallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.points_wallet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    CONSTRAINT points_wallet_balance_check CHECK ((balance >= 0))
);


--
-- Name: recognition_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recognition_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind public.recognition_kind NOT NULL,
    from_user_id uuid,
    value_id uuid,
    template_id uuid,
    message text DEFAULT ''::text NOT NULL,
    base_points integer DEFAULT 0 NOT NULL,
    art_url text,
    status public.recognition_status DEFAULT 'pending_approval'::public.recognition_status NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    idempotency_key uuid,
    source_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    award_id uuid,
    CONSTRAINT recognition_history_base_points_check CHECK ((base_points >= 0)),
    CONSTRAINT recognition_history_check CHECK (((kind <> 'award'::public.recognition_kind) OR (source_ref IS NULL))),
    CONSTRAINT recognition_history_message_check CHECK ((char_length(message) <= 2000))
);


--
-- Name: recognition_pending; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recognition_pending (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recognition_id uuid NOT NULL,
    pending_since timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recognition_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recognition_recipients (
    recognition_id uuid NOT NULL,
    user_id uuid NOT NULL,
    points integer NOT NULL,
    kind public.recipient_kind NOT NULL,
    CONSTRAINT recognition_recipients_check CHECK ((((kind = 'to'::public.recipient_kind) AND (points >= 0)) OR ((kind = 'cc'::public.recipient_kind) AND (points = 0))))
);


--
-- Name: recognition_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recognition_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    value_id uuid NOT NULL,
    name text NOT NULL,
    emoji text,
    art_json jsonb,
    prefill text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: role_assignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_assignment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);


--
-- Name: system_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_log (
    at timestamp with time zone DEFAULT now() NOT NULL,
    id bigint DEFAULT nextval('public.system_log_id_seq'::regclass) NOT NULL,
    level public.log_level NOT NULL,
    service text NOT NULL,
    message text NOT NULL,
    user_id uuid,
    request_id text,
    error_code text,
    context jsonb,
    hostname text,
    deploy_sha text
)
PARTITION BY RANGE (at);


--
-- Name: system_log_default; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_log_default (
    at timestamp with time zone DEFAULT now() NOT NULL,
    id bigint DEFAULT nextval('public.system_log_id_seq'::regclass) NOT NULL,
    level public.log_level NOT NULL,
    service text NOT NULL,
    message text NOT NULL,
    user_id uuid,
    request_id text,
    error_code text,
    context jsonb,
    hostname text,
    deploy_sha text
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.team_member_role DEFAULT 'member'::public.team_member_role NOT NULL,
    valid_from date DEFAULT now() NOT NULL,
    valid_to date
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text,
    project_name text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: to_recog_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.to_recog_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    period_id uuid NOT NULL,
    allocated integer NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    CONSTRAINT to_recog_points_allocated_check CHECK ((allocated > 0)),
    CONSTRAINT to_recog_points_check CHECK (((balance >= 0) AND (balance <= allocated)))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_code text NOT NULL,
    email text NOT NULL,
    external_id text,
    full_name text NOT NULL,
    title text,
    department text,
    avatar_url text,
    joined_on date,
    manager_id uuid,
    manager_effective_from date DEFAULT now() NOT NULL,
    employment_status public.person_status DEFAULT 'active'::public.person_status NOT NULL,
    source public.person_source DEFAULT 'internal'::public.person_source NOT NULL,
    recognition_eligible boolean,
    recognition_eligible_effective_from date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_email_check CHECK ((email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text))
);


--
-- Name: verify2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verify2 (
    check_name text,
    ok boolean,
    detail text
);


--
-- Name: verify_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verify_results (
    check_name text,
    ok boolean,
    detail text
);


--
-- Name: vw_directory; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_directory AS
 SELECT users.id,
    users.full_name,
    users.title,
    users.department,
    users.avatar_url
   FROM public.users;


--
-- Name: vw_ledger_person; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_ledger_person AS
 SELECT ledger.id,
    ledger.user_id,
    ledger.amount,
    ledger.kind,
        CASE
            WHEN (ledger.kind = 'recognition_hold'::public.ledger_kind) THEN 'Recognition pending approval'::text
            ELSE ledger.label
        END AS label,
    ledger.created_at
   FROM public.ledger;


--
-- Name: vw_team_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_team_stats AS
 SELECT tm.team_id,
    tm.user_id,
    rr.kind,
    sum(rr.points) AS points_this_period
   FROM (public.team_members tm
     LEFT JOIN public.recognition_recipients rr ON (((rr.user_id = tm.user_id) AND (rr.kind = 'to'::public.recipient_kind))))
  WHERE (tm.valid_to IS NULL)
  GROUP BY tm.team_id, tm.user_id, rr.kind;


--
-- Name: vw_wallet_reconcile; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_wallet_reconcile AS
SELECT
    NULL::uuid AS wallet_id,
    NULL::uuid AS user_id,
    NULL::integer AS balance,
    NULL::bigint AS ledger_sum,
    NULL::bigint AS drift;


--
-- Name: system_log_default; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_log ATTACH PARTITION public.system_log_default DEFAULT;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: admin_setting_key admin_setting_key_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_setting_key
    ADD CONSTRAINT admin_setting_key_pkey PRIMARY KEY (key);


--
-- Name: admin_setting admin_setting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_setting
    ADD CONSTRAINT admin_setting_pkey PRIMARY KEY (key);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: approval_item approval_item_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: approval_item approval_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_pkey PRIMARY KEY (id);


--
-- Name: approval_item_step approval_item_step_approval_item_id_seq_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item_step
    ADD CONSTRAINT approval_item_step_approval_item_id_seq_owner_id_key UNIQUE (approval_item_id, seq, owner_id);


--
-- Name: approval_item_step approval_item_step_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item_step
    ADD CONSTRAINT approval_item_step_pkey PRIMARY KEY (id);


--
-- Name: approval_rule approval_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule
    ADD CONSTRAINT approval_rule_pkey PRIMARY KEY (id);


--
-- Name: approval_rule_step approval_rule_step_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_step
    ADD CONSTRAINT approval_rule_step_pkey PRIMARY KEY (id);


--
-- Name: approval_rule_step approval_rule_step_rule_id_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_step
    ADD CONSTRAINT approval_rule_step_rule_id_seq_key UNIQUE (rule_id, seq);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: awards_nominations awards_nominations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards_nominations
    ADD CONSTRAINT awards_nominations_pkey PRIMARY KEY (id);


--
-- Name: awards awards_period_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_period_id_name_key UNIQUE (period_id, name);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: ballot ballot_nomination_id_juror_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ballot
    ADD CONSTRAINT ballot_nomination_id_juror_id_key UNIQUE (nomination_id, juror_id);


--
-- Name: ballot ballot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ballot
    ADD CONSTRAINT ballot_pkey PRIMARY KEY (id);


--
-- Name: budget_policy budget_policy_grants_role_band_employee_id_effective_from_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_policy
    ADD CONSTRAINT budget_policy_grants_role_band_employee_id_effective_from_key UNIQUE (grants, role_band_employee_id, effective_from);


--
-- Name: budget_policy budget_policy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_policy
    ADD CONSTRAINT budget_policy_pkey PRIMARY KEY (id);


--
-- Name: emids_values emids_values_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emids_values
    ADD CONSTRAINT emids_values_key_key UNIQUE (key);


--
-- Name: emids_values emids_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emids_values
    ADD CONSTRAINT emids_values_pkey PRIMARY KEY (id);


--
-- Name: fiscal_period fiscal_period_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_period
    ADD CONSTRAINT fiscal_period_name_key UNIQUE (name);


--
-- Name: fiscal_period fiscal_period_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_period
    ADD CONSTRAINT fiscal_period_pkey PRIMARY KEY (id);


--
-- Name: fiscal_period fiscal_period_starts_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_period
    ADD CONSTRAINT fiscal_period_starts_key UNIQUE (starts);


--
-- Name: job_run job_run_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_run
    ADD CONSTRAINT job_run_pkey PRIMARY KEY (id);


--
-- Name: journal_entry journal_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry
    ADD CONSTRAINT journal_entry_pkey PRIMARY KEY (id);


--
-- Name: journal_line journal_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_line
    ADD CONSTRAINT journal_line_pkey PRIMARY KEY (id);


--
-- Name: jury_assignment jury_assignment_award_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jury_assignment
    ADD CONSTRAINT jury_assignment_award_id_user_id_key UNIQUE (award_id, user_id);


--
-- Name: jury_assignment jury_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jury_assignment
    ADD CONSTRAINT jury_assignment_pkey PRIMARY KEY (id);


--
-- Name: ledger_account ledger_account_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_account
    ADD CONSTRAINT ledger_account_code_key UNIQUE (code);


--
-- Name: ledger_account ledger_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_account
    ADD CONSTRAINT ledger_account_pkey PRIMARY KEY (id);


--
-- Name: ledger ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_pkey PRIMARY KEY (id);


--
-- Name: milestone_rule milestone_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_rule
    ADD CONSTRAINT milestone_rule_pkey PRIMARY KEY (id);


--
-- Name: milestone_rule milestone_rule_trigger_years_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_rule
    ADD CONSTRAINT milestone_rule_trigger_years_key UNIQUE (trigger, years);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: outbox_event outbox_event_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_event
    ADD CONSTRAINT outbox_event_dedupe_key_key UNIQUE (dedupe_key);


--
-- Name: outbox_event outbox_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_event
    ADD CONSTRAINT outbox_event_pkey PRIMARY KEY (id);


--
-- Name: points_wallet points_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_wallet
    ADD CONSTRAINT points_wallet_pkey PRIMARY KEY (id);


--
-- Name: points_wallet points_wallet_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_wallet
    ADD CONSTRAINT points_wallet_user_id_key UNIQUE (user_id);


--
-- Name: recognition_history recognition_history_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: recognition_history recognition_history_kind_source_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_kind_source_ref_key UNIQUE (kind, source_ref);


--
-- Name: recognition_history recognition_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_pkey PRIMARY KEY (id);


--
-- Name: recognition_pending recognition_pending_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_pending
    ADD CONSTRAINT recognition_pending_pkey PRIMARY KEY (id);


--
-- Name: recognition_pending recognition_pending_recognition_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_pending
    ADD CONSTRAINT recognition_pending_recognition_id_key UNIQUE (recognition_id);


--
-- Name: recognition_recipients recognition_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_recipients
    ADD CONSTRAINT recognition_recipients_pkey PRIMARY KEY (recognition_id, user_id);


--
-- Name: recognition_templates recognition_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_pkey PRIMARY KEY (id);


--
-- Name: recognition_templates recognition_templates_value_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_value_id_name_key UNIQUE (value_id, name);


--
-- Name: role_assignment role_assignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignment
    ADD CONSTRAINT role_assignment_pkey PRIMARY KEY (id);


--
-- Name: system_log system_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_log
    ADD CONSTRAINT system_log_pkey PRIMARY KEY (at, id);


--
-- Name: system_log_default system_log_default_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_log_default
    ADD CONSTRAINT system_log_default_pkey PRIMARY KEY (at, id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: teams teams_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_code_key UNIQUE (code);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: to_recog_points to_recog_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_recog_points
    ADD CONSTRAINT to_recog_points_pkey PRIMARY KEY (id);


--
-- Name: to_recog_points to_recog_points_user_id_period_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_recog_points
    ADD CONSTRAINT to_recog_points_user_id_period_id_key UNIQUE (user_id, period_id);


--
-- Name: users users_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_employee_code_key UNIQUE (employee_code);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: approval_item_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_item_pending_idx ON public.approval_item USING btree (status) WHERE (status = 'pending'::public.approval_status);


--
-- Name: approval_item_resubmit_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX approval_item_resubmit_uniq ON public.approval_item USING btree (resubmitted_from) WHERE (resubmitted_from IS NOT NULL);


--
-- Name: approval_item_step_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_item_step_pending_idx ON public.approval_item_step USING btree (owner_id, status) WHERE (status = 'pending'::public.step_status);


--
-- Name: approval_item_submitter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX approval_item_submitter_idx ON public.approval_item USING btree (submitter_id);


--
-- Name: approval_rule_kind_priority_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX approval_rule_kind_priority_uniq ON public.approval_rule USING btree (kind, priority) WHERE is_active;


--
-- Name: audit_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_at_idx ON public.audit_log USING btree (at);


--
-- Name: audit_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_entity_idx ON public.audit_log USING btree (entity, entity_id);


--
-- Name: awards_nom_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX awards_nom_status_idx ON public.awards_nominations USING btree (award_id, status);


--
-- Name: awards_nom_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX awards_nom_uniq ON public.awards_nominations USING btree (award_id, nominee_id);


--
-- Name: awards_phase_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX awards_phase_idx ON public.awards USING btree (phase);


--
-- Name: budget_policy_open_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX budget_policy_open_uniq ON public.budget_policy USING btree (grants, role_band_employee_id) WHERE (effective_to IS NULL);


--
-- Name: job_run_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_run_recent_idx ON public.job_run USING btree (job_name, started_at DESC);


--
-- Name: job_run_running_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX job_run_running_uniq ON public.job_run USING btree (job_name) WHERE (status = 'running'::public.job_status);


--
-- Name: journal_line_journal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_line_journal_idx ON public.journal_line USING btree (journal_id);


--
-- Name: ledger_allowance_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledger_allowance_idx ON public.ledger USING btree (to_recog_points_id, created_at);


--
-- Name: ledger_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledger_user_idx ON public.ledger USING btree (user_id, created_at);


--
-- Name: ledger_wallet_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledger_wallet_idx ON public.ledger USING btree (points_wallet_id, created_at);


--
-- Name: notification_dedupe_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_dedupe_uniq ON public.notification USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: notification_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_unread_idx ON public.notification USING btree (user_id, created_at DESC) WHERE (delivery_status = ANY (ARRAY['queued'::public.delivery_status, 'sent'::public.delivery_status]));


--
-- Name: outbox_relay_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_relay_idx ON public.outbox_event USING btree (status, next_attempt_at);


--
-- Name: recognition_from_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recognition_from_idx ON public.recognition_history USING btree (from_user_id, occurred_at DESC);


--
-- Name: recognition_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recognition_pending_idx ON public.recognition_history USING btree (status, occurred_at) WHERE (status = 'pending_approval'::public.recognition_status);


--
-- Name: recognition_recipients_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recognition_recipients_user_idx ON public.recognition_recipients USING btree (user_id, kind);


--
-- Name: role_assignment_open_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_assignment_open_uniq ON public.role_assignment USING btree (user_id, role) WHERE (revoked_at IS NULL);


--
-- Name: team_members_lead_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_members_lead_uniq ON public.team_members USING btree (team_id) WHERE ((valid_to IS NULL) AND (role = 'lead'::public.team_member_role));


--
-- Name: team_members_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_open_idx ON public.team_members USING btree (team_id, role) WHERE (valid_to IS NULL);


--
-- Name: team_members_open_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX team_members_open_uniq ON public.team_members USING btree (team_id, user_id) WHERE (valid_to IS NULL);


--
-- Name: team_members_team_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_team_idx ON public.team_members USING btree (team_id);


--
-- Name: team_members_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_members_user_idx ON public.team_members USING btree (user_id);


--
-- Name: users_external_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_external_idx ON public.users USING btree (external_id) WHERE (external_id IS NOT NULL);


--
-- Name: users_lower_email_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_lower_email_uniq ON public.users USING btree (lower(email));


--
-- Name: users_manager_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_manager_idx ON public.users USING btree (manager_id);


--
-- Name: users_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_status_idx ON public.users USING btree (employment_status);


--
-- Name: system_log_default_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.system_log_pkey ATTACH PARTITION public.system_log_default_pkey;


--
-- Name: vw_wallet_reconcile _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.vw_wallet_reconcile AS
 SELECT pw.id AS wallet_id,
    pw.user_id,
    pw.balance,
    COALESCE(sum(l.amount), (0)::bigint) AS ledger_sum,
    (pw.balance - COALESCE(sum(l.amount), (0)::bigint)) AS drift
   FROM (public.points_wallet pw
     LEFT JOIN public.ledger l ON ((l.points_wallet_id = pw.id)))
  GROUP BY pw.id;


--
-- Name: awards awards_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER awards_touch BEFORE UPDATE ON public.awards FOR EACH ROW EXECUTE FUNCTION public.trg_touch_updated_at();


--
-- Name: approval_item item_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER item_touch BEFORE UPDATE ON public.approval_item FOR EACH ROW EXECUTE FUNCTION public.trg_touch_updated_at();


--
-- Name: recognition_history recognition_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER recognition_touch BEFORE UPDATE ON public.recognition_history FOR EACH ROW EXECUTE FUNCTION public.trg_touch_updated_at();


--
-- Name: teams teams_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER teams_touch BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.trg_touch_updated_at();


--
-- Name: approval_item_step trg_coi_backstop; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_coi_backstop BEFORE INSERT OR UPDATE OF status, owner_id ON public.approval_item_step FOR EACH ROW EXECUTE FUNCTION public.coi_backstop();


--
-- Name: journal_line trg_journal_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_journal_balance AFTER INSERT ON public.journal_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.journal_must_balance();


--
-- Name: ledger trg_ledger_delta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ledger_delta AFTER INSERT ON public.ledger FOR EACH ROW EXECUTE FUNCTION public.apply_ledger_delta();


--
-- Name: recognition_history trg_pending_projection; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pending_projection AFTER INSERT OR UPDATE OF status ON public.recognition_history FOR EACH ROW EXECUTE FUNCTION public.sync_pending_projection();


--
-- Name: approval_rule trg_rule_condition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rule_condition BEFORE INSERT OR UPDATE ON public.approval_rule FOR EACH ROW EXECUTE FUNCTION public.validate_rule_condition();


--
-- Name: admin_setting trg_setting_validate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_setting_validate BEFORE INSERT OR UPDATE ON public.admin_setting FOR EACH ROW EXECUTE FUNCTION public.validate_setting_value();


--
-- Name: users users_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER users_touch BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trg_touch_updated_at();


--
-- Name: admin_setting admin_setting_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_setting
    ADD CONSTRAINT admin_setting_key_fkey FOREIGN KEY (key) REFERENCES public.admin_setting_key(key) ON DELETE RESTRICT;


--
-- Name: admin_setting admin_setting_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_setting
    ADD CONSTRAINT admin_setting_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: approval_item approval_item_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: approval_item approval_item_nomination_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_nomination_fk FOREIGN KEY (nomination_id) REFERENCES public.awards_nominations(id);


--
-- Name: approval_item approval_item_recognition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_recognition_id_fkey FOREIGN KEY (recognition_id) REFERENCES public.recognition_history(id) ON DELETE CASCADE;


--
-- Name: approval_item approval_item_resubmitted_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_resubmitted_from_fkey FOREIGN KEY (resubmitted_from) REFERENCES public.approval_item(id);


--
-- Name: approval_item approval_item_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.approval_rule(id);


--
-- Name: approval_item_step approval_item_step_approval_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item_step
    ADD CONSTRAINT approval_item_step_approval_item_id_fkey FOREIGN KEY (approval_item_id) REFERENCES public.approval_item(id) ON DELETE CASCADE;


--
-- Name: approval_item_step approval_item_step_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item_step
    ADD CONSTRAINT approval_item_step_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: approval_item_step approval_item_step_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item_step
    ADD CONSTRAINT approval_item_step_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: approval_item approval_item_submitter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_item
    ADD CONSTRAINT approval_item_submitter_id_fkey FOREIGN KEY (submitter_id) REFERENCES public.users(id);


--
-- Name: approval_rule approval_rule_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule
    ADD CONSTRAINT approval_rule_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: approval_rule_step approval_rule_step_fixed_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_step
    ADD CONSTRAINT approval_rule_step_fixed_user_id_fkey FOREIGN KEY (fixed_user_id) REFERENCES public.users(id);


--
-- Name: approval_rule_step approval_rule_step_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_rule_step
    ADD CONSTRAINT approval_rule_step_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.approval_rule(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_actor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_actor_fkey FOREIGN KEY (actor) REFERENCES public.users(id);


--
-- Name: awards awards_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: awards_nominations awards_nominations_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards_nominations
    ADD CONSTRAINT awards_nominations_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.awards(id) ON DELETE CASCADE;


--
-- Name: awards_nominations awards_nominations_decided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards_nominations
    ADD CONSTRAINT awards_nominations_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id);


--
-- Name: awards_nominations awards_nominations_nominator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards_nominations
    ADD CONSTRAINT awards_nominations_nominator_id_fkey FOREIGN KEY (nominator_id) REFERENCES public.users(id);


--
-- Name: awards_nominations awards_nominations_nominee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards_nominations
    ADD CONSTRAINT awards_nominations_nominee_id_fkey FOREIGN KEY (nominee_id) REFERENCES public.users(id);


--
-- Name: awards awards_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.fiscal_period(id) ON DELETE RESTRICT;


--
-- Name: awards awards_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_value_id_fkey FOREIGN KEY (value_id) REFERENCES public.emids_values(id) ON DELETE SET NULL;


--
-- Name: awards awards_winner_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_winner_fk FOREIGN KEY (winner_nomination_id) REFERENCES public.awards_nominations(id);


--
-- Name: ballot ballot_juror_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ballot
    ADD CONSTRAINT ballot_juror_id_fkey FOREIGN KEY (juror_id) REFERENCES public.users(id);


--
-- Name: ballot ballot_nomination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ballot
    ADD CONSTRAINT ballot_nomination_id_fkey FOREIGN KEY (nomination_id) REFERENCES public.awards_nominations(id) ON DELETE CASCADE;


--
-- Name: budget_policy budget_policy_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_policy
    ADD CONSTRAINT budget_policy_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: budget_policy budget_policy_role_band_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_policy
    ADD CONSTRAINT budget_policy_role_band_employee_id_fkey FOREIGN KEY (role_band_employee_id) REFERENCES public.users(id);


--
-- Name: journal_entry journal_entry_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry
    ADD CONSTRAINT journal_entry_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_entry journal_entry_linked_award_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry
    ADD CONSTRAINT journal_entry_linked_award_fk FOREIGN KEY (linked_award_id) REFERENCES public.awards(id);


--
-- Name: journal_entry journal_entry_linked_recognition_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry
    ADD CONSTRAINT journal_entry_linked_recognition_fk FOREIGN KEY (linked_recognition_id) REFERENCES public.recognition_history(id);


--
-- Name: journal_entry journal_entry_reverses_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entry
    ADD CONSTRAINT journal_entry_reverses_fkey FOREIGN KEY (reverses) REFERENCES public.journal_entry(id);


--
-- Name: journal_line journal_line_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_line
    ADD CONSTRAINT journal_line_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.ledger_account(id);


--
-- Name: journal_line journal_line_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_line
    ADD CONSTRAINT journal_line_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.journal_entry(id) ON DELETE CASCADE;


--
-- Name: jury_assignment jury_assignment_award_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jury_assignment
    ADD CONSTRAINT jury_assignment_award_id_fkey FOREIGN KEY (award_id) REFERENCES public.awards(id) ON DELETE CASCADE;


--
-- Name: jury_assignment jury_assignment_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jury_assignment
    ADD CONSTRAINT jury_assignment_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: jury_assignment jury_assignment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jury_assignment
    ADD CONSTRAINT jury_assignment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ledger_account ledger_account_allowance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_account
    ADD CONSTRAINT ledger_account_allowance_id_fkey FOREIGN KEY (allowance_id) REFERENCES public.to_recog_points(id);


--
-- Name: ledger_account ledger_account_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_account
    ADD CONSTRAINT ledger_account_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ledger_account ledger_account_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_account
    ADD CONSTRAINT ledger_account_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.points_wallet(id);


--
-- Name: ledger ledger_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ledger ledger_journal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES public.journal_entry(id) ON DELETE CASCADE;


--
-- Name: ledger ledger_points_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_points_wallet_id_fkey FOREIGN KEY (points_wallet_id) REFERENCES public.points_wallet(id) ON DELETE RESTRICT;


--
-- Name: ledger ledger_to_recog_points_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_to_recog_points_id_fkey FOREIGN KEY (to_recog_points_id) REFERENCES public.to_recog_points(id) ON DELETE RESTRICT;


--
-- Name: ledger ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger
    ADD CONSTRAINT ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notification notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: points_wallet points_wallet_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.points_wallet
    ADD CONSTRAINT points_wallet_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recognition_history recognition_history_award_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_award_fk FOREIGN KEY (award_id) REFERENCES public.awards(id);


--
-- Name: recognition_history recognition_history_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: recognition_history recognition_history_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.recognition_templates(id) ON DELETE SET NULL;


--
-- Name: recognition_history recognition_history_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_history
    ADD CONSTRAINT recognition_history_value_id_fkey FOREIGN KEY (value_id) REFERENCES public.emids_values(id) ON DELETE SET NULL;


--
-- Name: recognition_pending recognition_pending_recognition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_pending
    ADD CONSTRAINT recognition_pending_recognition_id_fkey FOREIGN KEY (recognition_id) REFERENCES public.recognition_history(id) ON DELETE CASCADE;


--
-- Name: recognition_recipients recognition_recipients_recognition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_recipients
    ADD CONSTRAINT recognition_recipients_recognition_id_fkey FOREIGN KEY (recognition_id) REFERENCES public.recognition_history(id) ON DELETE CASCADE;


--
-- Name: recognition_recipients recognition_recipients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_recipients
    ADD CONSTRAINT recognition_recipients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recognition_templates recognition_templates_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recognition_templates
    ADD CONSTRAINT recognition_templates_value_id_fkey FOREIGN KEY (value_id) REFERENCES public.emids_values(id) ON DELETE CASCADE;


--
-- Name: role_assignment role_assignment_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignment
    ADD CONSTRAINT role_assignment_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: role_assignment role_assignment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_assignment
    ADD CONSTRAINT role_assignment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_log system_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.system_log
    ADD CONSTRAINT system_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: to_recog_points to_recog_points_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_recog_points
    ADD CONSTRAINT to_recog_points_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.fiscal_period(id) ON DELETE RESTRICT;


--
-- Name: to_recog_points to_recog_points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.to_recog_points
    ADD CONSTRAINT to_recog_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict ohuKdfJSsZr5hnEaEUipqIhUxklQHYAY1arzBsaDzR5KgXfEELMktqrfNdT42hV

