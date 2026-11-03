"""0007_recognition — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0007_recognition"
down_revision = "0006_config"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE recognition_history (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind            recognition_kind NOT NULL,
      from_user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
      value_id        uuid REFERENCES emids_values(id) ON DELETE SET NULL,
      template_id     uuid REFERENCES recognition_templates(id) ON DELETE SET NULL,
      message         text NOT NULL DEFAULT '' CHECK (char_length(message) <= 2000),
      base_points     int NOT NULL DEFAULT 0 CHECK (base_points >= 0),
      art_url         text,
      status          recognition_status NOT NULL DEFAULT 'pending_approval',
      occurred_at     timestamptz NOT NULL DEFAULT now(),
      idempotency_key uuid UNIQUE,
      source_ref      text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      CHECK (kind <> 'award' OR source_ref IS NULL),
      UNIQUE (kind, source_ref)
    );
    CREATE INDEX recognition_pending_idx ON recognition_history (status, occurred_at)
      WHERE status = 'pending_approval';
    CREATE INDEX recognition_from_idx ON recognition_history (from_user_id, occurred_at DESC);

    -- award_id -> awards created later; column first, constraint added in 0008
    ALTER TABLE recognition_history ADD COLUMN award_id uuid;

    -- journal_entry -> recognition_history (created bare in 0005, constrained now)
    ALTER TABLE journal_entry
      ADD CONSTRAINT journal_entry_linked_recognition_fk
      FOREIGN KEY (linked_recognition_id) REFERENCES recognition_history(id);

    CREATE TABLE recognition_recipients (
      recognition_id uuid NOT NULL REFERENCES recognition_history(id) ON DELETE CASCADE,
      user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points         int NOT NULL,
      kind           recipient_kind NOT NULL,
      PRIMARY KEY (recognition_id, user_id),
      CHECK ((kind = 'to' AND points >= 0) OR (kind = 'cc' AND points = 0))
    );
    CREATE INDEX recognition_recipients_user_idx ON recognition_recipients (user_id, kind);

    -- the pending projection: trigger-maintained, app never writes
    CREATE TABLE recognition_pending (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recognition_id uuid NOT NULL UNIQUE REFERENCES recognition_history(id) ON DELETE CASCADE,
      pending_since  timestamptz NOT NULL DEFAULT now()
    );

    CREATE OR REPLACE FUNCTION sync_pending_projection() RETURNS trigger AS $$
    BEGIN
      IF NEW.status = 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status <> 'pending_approval') THEN
        INSERT INTO recognition_pending (recognition_id) VALUES (NEW.id)
          ON CONFLICT (recognition_id) DO NOTHING;
      ELSIF NEW.status <> 'pending_approval' AND (TG_OP = 'INSERT' OR OLD.status = 'pending_approval') THEN
        DELETE FROM recognition_pending WHERE recognition_id = NEW.id;
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_pending_projection AFTER INSERT OR UPDATE OF status ON recognition_history
      FOR EACH ROW EXECUTE FUNCTION sync_pending_projection();

    CREATE TRIGGER recognition_touch BEFORE UPDATE ON recognition_history
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at()""")

def downgrade() -> None:
    op.execute(r"""
    DROP TRIGGER IF EXISTS recognition_touch ON recognition_history;
    DROP TRIGGER IF EXISTS trg_pending_projection ON recognition_history;
    DROP FUNCTION IF EXISTS sync_pending_projection();
    DROP TABLE IF EXISTS recognition_pending;
    DROP TABLE IF EXISTS recognition_recipients;
    ALTER TABLE journal_entry DROP CONSTRAINT IF EXISTS journal_entry_linked_recognition_fk;
    ALTER TABLE recognition_history DROP COLUMN IF EXISTS award_id;
    DROP TABLE IF EXISTS recognition_history""")
