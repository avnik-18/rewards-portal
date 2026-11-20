"""0025_users_birth_date — birth_date on users for milestone suggestions.

joined_on already carries the work-anniversary date; birth_date completes the
pair the /celebrations upcoming-milestone read (relevant people per viewer)
needs. Nullable: legacy HR records without it simply never surface a birthday.
"""

from alembic import op

revision = "0025_users_birth_date"
down_revision = "0024_feed_ranked"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN birth_date date")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS birth_date")
