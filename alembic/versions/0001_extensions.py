"""0001_extensions — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0001_extensions"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    -- note: pgcrypto solves crypt()/digest(); system_log lands (default
    -- partition, no monthly ranges) in 0014_logs_views.
  """)

def downgrade() -> None:
    op.execute(r"""DROP EXTENSION IF EXISTS pgcrypto""")
