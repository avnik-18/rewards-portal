"""0036 — DM/DH leadership lanes on teams.

The leader roles split: a team carries its DIRECT DELIVERY MANAGER (dm_id —
the person who nominates that team's people) and its DELIVERY HEAD (dh_id —
the person whose approval lane the nominations route into). A single leader
can own several team rows (a multi-team DM), and one DH sits over several
DM's teams by construction.

- teams.dm_id / teams.dh_id: FK columns, both nullable (a team may be
  unmapped — such teams' nominations stay admin-only until mapped).
- fn_nomination_decide (0032 body + the lane gate): the decider must be the
  nominee's team's DH; the admin persona overrides.

Demo/production team mappings are data, not DDL — they arrive through the
admin flow or the seed (seed/demo.sql assigns the demo org after this
revision's columns exist).
"""

from pathlib import Path

from alembic import op

revision = "0036_dm_dh_lanes"
down_revision = "0035_nomination_module"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute("""
        ALTER TABLE teams
            ADD COLUMN IF NOT EXISTS dm_id uuid REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS dh_id uuid REFERENCES users(id) ON DELETE SET NULL
    """)
    op.execute("CREATE INDEX IF NOT EXISTS teams_dh_lane_idx ON teams (dh_id)")
    op.execute("CREATE INDEX IF NOT EXISTS teams_dm_lane_idx ON teams (dm_id)")
    op.execute((SQL_DIR / "0036_fn_nomination_decide.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    # restore 0032's unscoped decide body, then drop the lane columns
    op.execute((SQL_DIR / "0032_fn_nomination_decide.sql").read_text(encoding="utf-8"))
    op.execute("DROP INDEX IF EXISTS teams_dm_lane_idx")
    op.execute("DROP INDEX IF EXISTS teams_dh_lane_idx")
    op.execute("""
        ALTER TABLE teams
            DROP COLUMN IF EXISTS dm_id,
            DROP COLUMN IF EXISTS dh_id
    """)
