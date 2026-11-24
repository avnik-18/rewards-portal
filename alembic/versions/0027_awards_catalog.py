"""0027_awards_catalog — admin-authored awards catalog columns on `awards`.

cadence: what period kind the award is granted in (drives the /awards chips),
guidelines: the JSONB sections the Guidelines modal reads — authored by the
admin, so the portal never hard-codes eligibility text.
"""

from alembic import op

revision = "0027_awards_catalog"
down_revision = "0026_admin_event"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE award_cadence AS ENUM ('monthly', 'quarterly', 'annual');
        ALTER TABLE awards
          ADD COLUMN cadence award_cadence NOT NULL DEFAULT 'quarterly',
          ADD COLUMN guidelines jsonb;
        CREATE INDEX awards_cadence_idx ON awards (cadence);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS awards_cadence_idx;
        ALTER TABLE awards
          DROP COLUMN IF EXISTS guidelines,
          DROP COLUMN IF EXISTS cadence;
        DROP TYPE IF EXISTS award_cadence;
    """)
