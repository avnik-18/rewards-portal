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
    -- note: pg_partman is a separate install; monthly partitions for system_log
    -- are created natively in 0011 with default+new partitions reporting.
  """)

def downgrade() -> None:
    op.execute(r"""DROP EXTENSION IF EXISTS pgcrypto""")
