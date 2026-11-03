"""0010_system_outbox — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0010_system_outbox"
down_revision = "0009_awards"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE notification (
      id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type      notification_type NOT NULL,
      channel   notification_channel NOT NULL DEFAULT 'in_app',
      payload   jsonb NOT NULL,
      delivery_status delivery_status NOT NULL DEFAULT 'queued',
      dedupe_key text,
      read_at   timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX notification_dedupe_uniq ON notification (dedupe_key)
      WHERE dedupe_key IS NOT NULL;
    CREATE INDEX notification_unread_idx ON notification (user_id, created_at DESC)
      WHERE delivery_status IN ('queued','sent');

    CREATE TABLE outbox_event (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      aggregate   outbox_aggregate NOT NULL,
      aggregate_id text NOT NULL,
      event_type  text NOT NULL,
      payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
      status      outbox_status NOT NULL DEFAULT 'pending',
      attempts    int NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      sent_at     timestamptz,
      dedupe_key  text UNIQUE,
      created_at  timestamptz NOT NULL DEFAULT now(),
      relayed_at  timestamptz
    );
    CREATE INDEX outbox_relay_idx ON outbox_event (status, next_attempt_at)""")

def downgrade() -> None:
    op.execute(r"""
    DROP TABLE IF EXISTS outbox_event;
    DROP TABLE IF EXISTS notification""")
