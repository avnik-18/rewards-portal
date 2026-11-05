"""0012_seed — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0012_seed"
down_revision = "0011_observability"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    -- structural anchors only: the SYS_* journal accounts the money core
    -- posts against. NO reference/business data ships here — fiscal periods
    -- are reference data and arrive through the admin flow or a seed script.
    INSERT INTO ledger_account (code, kind) VALUES
      ('SYS_BUDGET_FUND', 'system'),
      ('SYS_PENDING',     'system'),
      ('SYS_PRIZE',       'system'),
      ('SYS_MILESTONE_FUND','system'),
      ('SYS_REDEEMED',    'system'),
      ('SYS_EXP',         'system')
    ON CONFLICT (code) DO NOTHING""")

def downgrade() -> None:
    op.execute(r"""
    DELETE FROM ledger_account WHERE kind = 'system' AND code LIKE 'SYS_%'""")
