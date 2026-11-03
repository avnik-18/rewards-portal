"""0012_seed — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0012_seed"
down_revision = "0011_observability"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    -- structural anchors only: a fiscal period that the money core needs,
    -- plus the SYS_* journal accounts — NO demo/business seed data ships here.
    INSERT INTO fiscal_period (id, name, starts, ends)
    VALUES ('11111111-1111-1111-1111-111111111101', 'FY26 Q4', '2026-10-01', '2026-12-31')
    ON CONFLICT (name) DO NOTHING;

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
    DELETE FROM ledger_account WHERE kind = 'system' AND code LIKE 'SYS_%';
    -- remove only the period this revision anchored; other revisions (demo
    -- seeds) may have added their own, and wiping those is not this downgrade's job
    DELETE FROM fiscal_period
    WHERE id = '11111111-1111-1111-1111-111111111101'
      AND name = 'FY26 Q4'""")
