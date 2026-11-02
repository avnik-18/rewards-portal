"""probe: which exec form breaks"""
from alembic import op

def upgrade() -> None:
    bind = op.get_bind()
    bind.exec_driver_sql("""SELECT 1;""")
    bind.exec_driver_sql("""CREATE TYPE probe_t AS ENUM ('a');
DROP TYPE probe_t;""")
    op.execute("SELECT 1")

def downgrade() -> None:
    pass
