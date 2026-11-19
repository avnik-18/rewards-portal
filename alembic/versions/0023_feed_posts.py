"""0023_feed_posts — feed_post projection table + read functions.

Rows are written by the publication pipeline AFTER the approval chain fully
resolves (final admin approval included): a recognition with no feed_post row
is still pending or declined and never reaches the feed. Unpublishing is an
UPDATE (is_public = false), not a DELETE, so the audit trail survives and the
entity unique index keeps re-publication idempotent. is_bu marks BU/org-level
posts and is set by the writing pipeline.

The read side is fn_feed_posts (keyset-paginated feed) and fn_persona
(viewer role class admin/leader/employee) from
alembic/sql/functions/0023_fn_feed_posts.sql and 0023_fn_persona.sql.
"""

from pathlib import Path

from alembic import op

revision = "0023_feed_posts"
down_revision = "0022_fn_submit_refs"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute("""
        CREATE TABLE feed_post (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            kind        text NOT NULL,
            entity_type text NOT NULL,
            entity_id   uuid NOT NULL,
            is_public   boolean NOT NULL DEFAULT true,
            actor_id    uuid REFERENCES users(id),
            occurred_at timestamptz NOT NULL DEFAULT now(),
            is_bu       boolean NOT NULL DEFAULT false
        )
    """)
    op.execute("CREATE UNIQUE INDEX feed_post_entity_uidx ON feed_post (entity_type, entity_id)")
    op.execute("CREATE INDEX feed_post_public_time_idx ON feed_post (is_public, occurred_at DESC)")
    op.execute("CREATE INDEX feed_post_actor_idx ON feed_post (actor_id)")
    op.execute((SQL_DIR / "0023_fn_feed_posts.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0023_fn_persona.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS fn_feed_posts(uuid, integer, text, timestamptz, uuid)")
    op.execute("DROP FUNCTION IF EXISTS fn_persona(uuid)")
    op.execute("DROP TABLE IF EXISTS feed_post")
