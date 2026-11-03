"""0016_step_level — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0016_step_level"
down_revision = "0015_staff_fn"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    ALTER TABLE approval_item_step ADD COLUMN level approval_level;
    -- backfill from the rule steps the items were created from
  """)
    op.execute(r"""
    UPDATE approval_item_step s
       SET level = rs.level
      FROM approval_item ai, approval_rule_step rs
     WHERE s.approval_item_id = ai.id AND ai.rule_id = rs.rule_id AND rs.seq = s.seq""")

def downgrade() -> None:
    op.execute(r"""ALTER TABLE approval_item_step DROP COLUMN IF EXISTS level""")
