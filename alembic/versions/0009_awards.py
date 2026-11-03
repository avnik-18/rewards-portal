"""0009_awards — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0009_awards"
down_revision = "0008_approvals"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE awards (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      period_id   uuid NOT NULL REFERENCES fiscal_period(id) ON DELETE RESTRICT,
      name        text NOT NULL,
      description text,
      value_id    uuid REFERENCES emids_values(id) ON DELETE SET NULL,
      prize_points int NOT NULL CHECK (prize_points > 0),
      max_nominations_per_nominator int NOT NULL DEFAULT 1 CHECK (max_nominations_per_nominator >= 1),
      requires_jury boolean NOT NULL DEFAULT true,
      phase       cycle_phase NOT NULL DEFAULT 'draft',
      nominations_end date,
      voting_end  date,
      winner_nomination_id uuid,
      winner_payout_points int CHECK (winner_payout_points IS NULL OR winner_payout_points > 0),
      decided_by  uuid REFERENCES users(id),
      decided_at  timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now(),
     updated_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (period_id, name),
      CHECK (voting_end IS NULL OR nominations_end IS NULL OR voting_end >= nominations_end),
      CHECK ((winner_nomination_id IS NULL AND decided_by IS NULL) OR decided_at IS NOT NULL)
    );
    CREATE INDEX awards_phase_idx ON awards (phase);

    CREATE TABLE awards_nominations (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      award_id    uuid NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
      nominee_id  uuid NOT NULL REFERENCES users(id),
      nominator_id uuid NOT NULL REFERENCES users(id),
      story       text NOT NULL DEFAULT '' CHECK (char_length(story) >= 0),
      is_self_nomination boolean NOT NULL DEFAULT false,
      shortlisted boolean,
      status      nomination_status NOT NULL DEFAULT 'submitted',
      flags       jsonb NOT NULL DEFAULT '[]'::jsonb,
      decided_by  uuid REFERENCES users(id),
      decided_at  timestamptz,
      created_at  timestamptz NOT NULL DEFAULT now(),
      CHECK (is_self_nomination = (nominator_id = nominee_id))
    );
    CREATE UNIQUE INDEX awards_nom_uniq ON awards_nominations (award_id, nominee_id);
    CREATE INDEX awards_nom_status_idx ON awards_nominations (award_id, status);

    CREATE TABLE jury_assignment (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      award_id   uuid NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      granted_by uuid REFERENCES users(id),
      granted_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (award_id, user_id)
    );

    CREATE TABLE ballot (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nomination_id uuid NOT NULL REFERENCES awards_nominations(id) ON DELETE CASCADE,
      juror_id      uuid NOT NULL REFERENCES users(id),
      score         smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
      note          text,
      voted_at      timestamptz NOT NULL DEFAULT now(),
      UNIQUE (nomination_id, juror_id)
    );

    -- journal_entry -> awards (created bare in 0005; constrained here)
    ALTER TABLE journal_entry
      ADD CONSTRAINT journal_entry_linked_award_fk
      FOREIGN KEY (linked_award_id) REFERENCES awards(id);

    -- recognition_history -> awards
    ALTER TABLE recognition_history
      ADD CONSTRAINT recognition_history_award_fk
      FOREIGN KEY (award_id) REFERENCES awards(id);

    -- awards -> awards_nominations: the cycle dissolved via ALTER
    ALTER TABLE awards
      ADD CONSTRAINT awards_winner_fk
      FOREIGN KEY (winner_nomination_id) REFERENCES awards_nominations(id);

    -- approval_item -> awards_nominations (created bare in 0008, constrained now)
    ALTER TABLE approval_item
      ADD CONSTRAINT approval_item_nomination_fk
      FOREIGN KEY (nomination_id) REFERENCES awards_nominations(id);

    CREATE TRIGGER awards_touch BEFORE UPDATE ON awards
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();

    -- fn_finalize (prize journaling): SYS_PRIZE must fund the payout
    CREATE OR REPLACE FUNCTION fn_finalize_award(p_award uuid, p_winner_nom uuid, p_decider uuid)
    RETURNS void AS $$
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
    END; $$ LANGUAGE plpgsql""")

def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_finalize_award;
    DROP TRIGGER IF EXISTS awards_touch ON awards;
    ALTER TABLE journal_entry DROP CONSTRAINT IF EXISTS journal_entry_linked_award_fk;
    ALTER TABLE recognition_history DROP CONSTRAINT IF EXISTS recognition_history_award_fk;
    ALTER TABLE approval_item DROP CONSTRAINT IF EXISTS approval_item_nomination_fk;
    -- the winner FK must go before its target table (dependency order)
    ALTER TABLE awards DROP CONSTRAINT IF EXISTS awards_winner_fk;
    DROP TABLE IF EXISTS ballot;
    DROP TABLE IF EXISTS jury_assignment;
    DROP TABLE IF EXISTS awards_nominations;
    DROP TABLE IF EXISTS awards""")
