"""probe: which exec form breaks
"""
from alembic import op

revision = "zzz9_probe"
down_revision = "0018_admin_fallback"
branch_labels = None
depends_on = None

def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("""SELECT 1;""")
    bind.exec_driver_sql("""CREATE TYPE probe_t AS ENUM ('a');
DROP TYPE probe_t;""")

def downgrade() -> None:
    pass
