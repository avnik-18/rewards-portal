"""0005_money_wallets — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0005_money_wallets"
down_revision = "0004_period_policy"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    -- wallet for the quarterly recognition-send allowance
    CREATE TABLE to_recog_points (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_id   uuid NOT NULL REFERENCES fiscal_period(id) ON DELETE RESTRICT,
      allocated   int NOT NULL CHECK (allocated > 0),
      balance     int NOT NULL DEFAULT 0 CHECK (balance >= 0 AND balance <= allocated),
      UNIQUE (user_id, period_id)
    );

    -- wallet for points earned (redemption currency)
    CREATE TABLE points_wallet (
      id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance int NOT NULL DEFAULT 0 CHECK (balance >= 0)
    );

    -- named accounts incl. system accounts
    CREATE TABLE ledger_account (
      id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code      text UNIQUE NOT NULL,
      kind      account_kind NOT NULL,
      user_id   uuid REFERENCES users(id),
      wallet_id uuid REFERENCES points_wallet(id),
      allowance_id uuid REFERENCES to_recog_points(id)
    );
    -- the user_wallet arm needs exactly one linked wallet
    ALTER TABLE ledger_account ADD CONSTRAINT ledger_account_user_wallet_chk CHECK (
      (kind = 'user_wallet') = (num_nonnulls(wallet_id, allowance_id) = 1)
    );
    ALTER TABLE ledger_account ADD CONSTRAINT ledger_account_system_chk CHECK (
      (kind = 'system') = (num_nonnulls(wallet_id, allowance_id, user_id) = 0)
    );

    -- journal header (one atomic money event)
    CREATE TABLE journal_entry (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind journal_kind NOT NULL,
      memo text,
      linked_recognition_id uuid,
      linked_award_id       uuid,
      linked_user_id        uuid,
      reverses  uuid REFERENCES journal_entry(id),
      reason text,
      status journal_status NOT NULL DEFAULT 'posted',
      created_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (num_nonnulls(linked_recognition_id, linked_award_id, linked_user_id) <= 1),
      CHECK (status = 'posted' OR reason IS NOT NULL)
    );

    -- journal lines: the entry must balance at commit (deferred)
    CREATE TABLE journal_line (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      journal_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
      account_id uuid NOT NULL REFERENCES ledger_account(id),
      direction journal_direction NOT NULL,
      amount int NOT NULL CHECK (amount > 0),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX journal_line_journal_idx ON journal_line (journal_id);

    -- ledger: book of record for wallet rows
    CREATE TABLE ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      journal_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
      to_recog_points_id uuid REFERENCES to_recog_points(id) ON DELETE RESTRICT,
      points_wallet_id uuid REFERENCES points_wallet(id) ON DELETE RESTRICT,
      kind ledger_kind NOT NULL,
      amount int NOT NULL CHECK (amount <> 0),
      label text NOT NULL DEFAULT '',
      user_id uuid NOT NULL REFERENCES users(id),
      created_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (num_nonnulls(to_recog_points_id, points_wallet_id) = 1)
    );
    CREATE INDEX ledger_wallet_idx ON ledger (points_wallet_id, created_at);
    CREATE INDEX ledger_allowance_idx ON ledger (to_recog_points_id, created_at);
    CREATE INDEX ledger_user_idx ON ledger (user_id, created_at)""")
    op.execute(r"""
    -- journal must balance: deferred so all lines exist at commit
    CREATE OR REPLACE FUNCTION journal_must_balance() RETURNS trigger AS $$
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
    END; $$ LANGUAGE plpgsql;

    CREATE CONSTRAINT TRIGGER trg_journal_balance AFTER INSERT ON journal_line
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
      EXECUTE FUNCTION journal_must_balance();

    -- wallet maintenance: ledger.amount is signed from the WALLET perspective,
    -- debit = -, credit = + on the ACCOUNT side
    CREATE OR REPLACE FUNCTION apply_ledger_delta() RETURNS trigger AS $$
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
    END; $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_ledger_delta AFTER INSERT ON ledger
      FOR EACH ROW EXECUTE FUNCTION apply_ledger_delta()""")
    op.execute(r"""
    -- ledger + journal_line are append-only; POC owns them with ledger_owner role
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ledger_owner') THEN
        CREATE ROLE ledger_owner;
      END IF;
    END $$;
    REVOKE UPDATE, DELETE ON ledger, journal_line FROM PUBLIC""")

def downgrade() -> None:
    op.execute(r"""
    DROP TABLE IF EXISTS ledger;
    DROP TABLE IF EXISTS journal_line;
    DROP FUNCTION IF EXISTS journal_must_balance();
    DROP FUNCTION IF EXISTS apply_ledger_delta();
    DROP TABLE IF EXISTS journal_entry;
    DROP TABLE IF EXISTS ledger_account;
    DROP TABLE IF EXISTS points_wallet;
    DROP TABLE IF EXISTS to_recog_points""")
