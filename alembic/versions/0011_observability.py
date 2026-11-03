"""0011_observability — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0011_observability"
down_revision = "0010_system_outbox"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE audit_log (
      id        bigserial PRIMARY KEY,
      actor     uuid REFERENCES users(id),
      action    text NOT NULL,
      entity    text NOT NULL,
      entity_id text,
      before    jsonb,
      after     jsonb,
      at        timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX audit_entity_idx ON audit_log (entity, entity_id);
    CREATE INDEX audit_at_idx ON audit_log (at);

    REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC""")

def downgrade() -> None:
    op.execute(r"""DROP TABLE IF EXISTS audit_log""")
