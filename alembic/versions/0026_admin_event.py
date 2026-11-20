"""0026_admin_event — org-wide events admins post (festivals, town halls).

Rows join the /celebrations upcoming read as kind='event' so the combined
"Upcoming events" rail covers birthdays, work anniversaries, and admin
announcements in one scroll. Dates are stored absolute; the demo seed
restamps them relative to each run.
"""

from alembic import op

revision = "0026_admin_event"
down_revision = "0025_users_birth_date"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE admin_event (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title      text NOT NULL,
            detail     text,
            event_at   date NOT NULL,
            created_by uuid REFERENCES users(id) ON DELETE SET NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("CREATE INDEX admin_event_when_idx ON admin_event (event_at)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS admin_event")
