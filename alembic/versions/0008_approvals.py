"""0008_approvals — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0008_approvals"
down_revision = "0007_recognition"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE approval_rule (
      id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind      approval_kind NOT NULL,
      version   int NOT NULL DEFAULT 1,
      condition jsonb,
      min_points int CHECK (min_points IS NULL OR min_points >= 0),
      max_points int,
      priority  int NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      version_note text,
      created_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (max_points IS NULL OR min_points IS NULL OR max_points >= min_points)
    );
    CREATE UNIQUE INDEX approval_rule_kind_priority_uniq ON approval_rule (kind, priority) WHERE is_active;

    -- condition grammar validator: fixed predicate shape
    CREATE OR REPLACE FUNCTION validate_rule_condition() RETURNS trigger AS $$
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
    END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_rule_condition BEFORE INSERT OR UPDATE ON approval_rule
      FOR EACH ROW EXECUTE FUNCTION validate_rule_condition();

    CREATE TABLE approval_rule_step (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_id     uuid NOT NULL REFERENCES approval_rule(id) ON DELETE CASCADE,
      seq         smallint NOT NULL CHECK (seq >= 1),
      level       approval_level NOT NULL,
      subject     approver_subject NOT NULL,
      fixed_user_id uuid REFERENCES users(id),
      mode        approver_mode NOT NULL DEFAULT 'ANY',
      sla_hours   int,
      escalation_target text CHECK (escalation_target IN ('fp_manager','fixed_sys_admin')),
      CHECK (subject <> 'fixed_user' OR fixed_user_id IS NOT NULL),
      CHECK (level <> 'FINANCE' OR subject = 'fixed_user'),
      UNIQUE (rule_id, seq)
    );

    CREATE TABLE approval_item (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind approval_kind NOT NULL,
      submitter_id uuid NOT NULL REFERENCES users(id),
      version int NOT NULL DEFAULT 1,
      resubmitted_from uuid REFERENCES approval_item(id),
      rule_id uuid REFERENCES approval_rule(id),
      rule_version int,
      recognition_id uuid REFERENCES recognition_history(id) ON DELETE CASCADE,
      nomination_id uuid,
      snapshot jsonb NOT NULL,
      status approval_status NOT NULL DEFAULT 'pending',
      decided_by uuid REFERENCES users(id),
      decided_at timestamptz,
      idempotency_key uuid UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (
        (kind = 'points_recognition' AND recognition_id IS NOT NULL AND nomination_id IS NULL)
        OR (kind = 'award_endorsement' AND nomination_id IS NOT NULL AND recognition_id IS NULL)
      ),
      CHECK ((status IN ('approved','returned','declined','cancelled'))
             = (decided_by IS NOT NULL AND decided_at IS NOT NULL))
    );
    CREATE INDEX approval_item_pending_idx ON approval_item (status) WHERE status = 'pending';
    CREATE INDEX approval_item_submitter_idx ON approval_item (submitter_id);
    CREATE UNIQUE INDEX approval_item_resubmit_uniq ON approval_item (resubmitted_from)
      WHERE resubmitted_from IS NOT NULL;

    CREATE TABLE approval_item_step (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_item_id uuid NOT NULL REFERENCES approval_item(id) ON DELETE CASCADE,
      seq smallint NOT NULL CHECK (seq >= 1),
      owner_id uuid NOT NULL REFERENCES users(id),
      mode approver_mode NOT NULL DEFAULT 'ANY',
      sla_due timestamptz,
      status step_status NOT NULL DEFAULT 'pending',
      decided_by uuid REFERENCES users(id),
      decided_at timestamptz,
      note text,
      UNIQUE (approval_item_id, seq, owner_id),
      CHECK (status IN ('pending','skipped','escalated') = (decided_at IS NULL)),
      CHECK (status <> 'declined' OR note IS NOT NULL)  -- B3 mandatory reasons
    );
    CREATE INDEX approval_item_step_pending_idx ON approval_item_step (owner_id, status)
      WHERE status = 'pending'""")
    op.execute(r"""
    -- COI backstop (approvals verifier): a conflicted approver's row can only be skipped/escalated
    CREATE OR REPLACE FUNCTION coi_backstop() RETURNS trigger AS $$
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
    END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER trg_coi_backstop BEFORE INSERT OR UPDATE OF status, owner_id ON approval_item_step
      FOR EACH ROW EXECUTE FUNCTION coi_backstop();

    CREATE TRIGGER item_touch BEFORE UPDATE ON approval_item
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at()""")
    op.execute(r"""
    -- fn_submit_recognition: creates everything atomically; nothing is half-written
    CREATE OR REPLACE FUNCTION fn_submit_recognition(
      p_from_user uuid, p_to_ids uuid[], p_cc_ids uuid[] DEFAULT NULL,
      p_value_id uuid DEFAULT NULL, p_template_id uuid DEFAULT NULL,
      p_message text DEFAULT '', p_base_points int DEFAULT 0,
      p_art_url text DEFAULT NULL, p_kind recognition_kind DEFAULT 'praise',
      p_idempotency_key uuid DEFAULT NULL)
    RETURNS uuid AS $$
    DECLARE
      v_recognition uuid; v_journal uuid; v_line uuid; v_item uuid;
      v_buyer uuid; v_rule uuid; v_version int; v_total int; v_now timestamptz := now();
      v_user RECORD; v_giver RECORD; v_alloc uuid; v_i int; v_share int;
    BEGIN
      -- giver eligibility (kept in v_giver — recipient loops never touch it)
      SELECT * INTO v_giver FROM users WHERE id = p_from_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'person_not_found'; END IF;
      IF NOT (COALESCE(v_giver.recognition_eligible, v_giver.employment_status = 'active')) THEN
        RAISE EXCEPTION 'person_inactive';
      END IF;
      -- self-praise block (M14)
      IF p_to_ids && ARRAY[p_from_user] THEN RAISE EXCEPTION 'self_recognition_blocked'; END IF;
      IF p_base_points < 0 OR p_base_points > 9999 THEN RAISE EXCEPTION 'points_out_of_range'; END IF;

      INSERT INTO recognition_history (kind, from_user_id, value_id, template_id,
        message, base_points, art_url, status, idempotency_key)
      VALUES (p_kind, p_from_user, p_value_id, p_template_id, p_message, p_base_points,
        p_art_url, (CASE WHEN p_base_points = 0 THEN 'approved' ELSE 'pending_approval' END)::recognition_status,
        p_idempotency_key)
      RETURNING id INTO v_recognition;

      -- recipients: to rows resolved points > 0, cc rows 0; guests cc-only
      IF p_to_ids IS NOT NULL THEN
        FOR v_i IN 1 .. array_length(p_to_ids, 1) LOOP
          v_buyer := p_to_ids[v_i];
          SELECT employment_status, source, recognition_eligible INTO v_user FROM users WHERE id = v_buyer;
          IF NOT FOUND THEN RAISE EXCEPTION 'recipient_not_found: %', v_buyer; END IF;
          IF v_user.source = 'guest' THEN RAISE EXCEPTION 'guest_cannot_receive'; END IF;
          IF NOT (COALESCE(v_user.recognition_eligible, v_user.employment_status = 'active')) THEN
            RAISE EXCEPTION 'person_inactive';
          END IF;
          -- resolved split: first n-1 get floor(base/n), the LAST carries the remainder,
          -- so SUM(to rows) is guaranteed = base_points (the money invariant)
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

      IF p_base_points = 0 THEN RETURN v_recognition; END IF; -- zero-points aside

      -- money: hold journal — debit giver allowance, credit SYS_PENDING
      IF p_base_points > 0 THEN
        v_total := COALESCE((SELECT SUM(points) FROM recognition_recipients
                    WHERE recognition_id = v_recognition AND kind='to'), 0);
        IF v_total <> p_base_points THEN
          RAISE EXCEPTION 'recipient_total_mismatch: % <> %', v_total, p_base_points;
        END IF;

        -- resolve allowance row: the period containing today
        SELECT t.id INTO v_alloc
          FROM to_recog_points t JOIN fiscal_period f ON f.id = t.period_id
         WHERE t.user_id = p_from_user AND now()::date BETWEEN f.starts AND f.ends;
        IF v_alloc IS NULL THEN RAISE EXCEPTION 'no_allowance_for_period'; END IF;
        IF  NOT EXISTS (SELECT 1 FROM to_recog_points WHERE id = v_alloc AND balance >= p_base_points) THEN
          RAISE EXCEPTION 'insufficient_points';
        END IF;

        INSERT INTO journal_entry (kind, memo, linked_recognition_id)
          VALUES ('recognition_hold', 'recognition hold', v_recognition)
          RETURNING id INTO v_journal;

        -- find wallet-facing accounts
        INSERT INTO ledger (journal_id, to_recog_points_id, kind, amount, user_id)
          VALUES (v_journal, v_alloc, 'recognition_hold', -p_base_points, v_giver.id)
          RETURNING id INTO v_line;

        INSERT INTO journal_line (journal_id, account_id, direction, amount)
          SELECT v_journal, a.id, 'debit', p_base_points
            FROM ledger_account a WHERE a.kind='user_wallet'
              AND a.allowance_id = v_alloc
          LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: allowance'; END IF;

        INSERT INTO journal_line (journal_id, account_id, direction, amount)
          SELECT v_journal, a.id, 'credit', p_base_points
            FROM ledger_account a WHERE a.code = 'SYS_PENDING' LIMIT 1;
        IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found: SYS_PENDING'; END IF;
      END IF;

      -- route: match the ACTIVE rule with the LOWEST priority number whose band
      -- contains the total and whose condition passes; no match -> hard error
      SELECT r.id, r.version INTO v_rule, v_version
        FROM approval_rule r
       WHERE r.kind = 'points_recognition' AND r.is_active
         AND COALESCE(r.min_points, 0) <= p_base_points
         AND COALESCE(r.max_points, 999999) >= p_base_points
         AND (r.condition IS NULL OR r.condition = '{}'::jsonb)
       ORDER BY r.priority ASC LIMIT 1;
      IF v_rule IS NULL THEN
        RAISE EXCEPTION 'no_approval_route';
      END IF;

      v_item := NULL;
      IF v_rule IS NOT NULL THEN
        INSERT INTO approval_item (kind, submitter_id, rule_id, rule_version,
          recognition_id, snapshot, status)
        VALUES ('points_recognition', p_from_user, v_rule, v_version, v_recognition,
          jsonb_build_object('recognition_id', v_recognition, 'base_points', p_base_points,
            'message', p_message, 'toIds', to_jsonb(p_to_ids), 'ccIds', to_jsonb(p_cc_ids),
            'value_id', p_value_id, 'template_id', p_template_id, 'art_url', p_art_url,
            'policy', jsonb_build_object('verdict','pass','notes','[]'::jsonb)),
          'pending')
        RETURNING id INTO v_item;
      END IF;

      RETURN v_recognition;
    END; $$ LANGUAGE plpgsql""")

def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_submit_recognition;
    DROP TRIGGER IF EXISTS trg_coi_backstop ON approval_item_step;
    DROP FUNCTION IF EXISTS coi_backstop();
    DROP TRIGGER IF EXISTS item_touch ON approval_item;
    DROP TABLE IF EXISTS approval_item_step;
    DROP TABLE IF EXISTS approval_item;
    ALTER TABLE journal_entry DROP CONSTRAINT IF EXISTS journal_entry_linked_recognition_fk;
    DROP TABLE IF EXISTS approval_rule_step;
    DROP TRIGGER IF EXISTS trg_rule_condition ON approval_rule;
    DROP FUNCTION IF EXISTS validate_rule_condition();
    DROP TABLE IF EXISTS approval_rule""")
