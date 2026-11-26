"""0032 — the DH approval WINDOW on award categories.

The admin authors approval_start/approval_end per award (new/edit in the
console); the DH lane breathes with the window:
- before approval_start: the DM nomination window still runs and the
  /approvals queue does NOT serve the award yet;
- inside [approval_start, approval_end]: the queue serves the award and the
  DH verdicts land;
- after approval_end: the lane shuts for the award (rows keep
  review_stage='dh' for the admin/follow-up flow to own).
- NULL window = the lane is always open (back-compat: categories authored
  before 0032 behave exactly as before).

Schema: awards + approval_start/approval_end date columns CHECK-pinned
(start set when end is; end not before start). fns (bodies in
alembic/sql/functions/ per convention):
- fn_admin_upsert_award EXTENDED (+p_approval_start/+p_approval_end trailing
  optional params; window validation C549W; both paths + audit log updated).
- fn_admin_list_cycles payload now carries the window dates (the console's
  edit form hydrates them).
- fn_nomination_decide gains the window guard (C5490 → 409
  nomination_window_closed outside the window).
No new SQLSTATEs — 0031's revision renamed NOTHING, this only extends."""

from pathlib import Path

from alembic import op

revision = "0032_award_approval_window"
down_revision = "0031_award_nomination_approvals"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute(r"""
    ALTER TABLE awards
      ADD COLUMN approval_start date,
      ADD COLUMN approval_end date
      CONSTRAINT awards_approval_window_check
      CHECK ((approval_start IS NULL AND approval_end IS NULL)
             OR (approval_start IS NOT NULL
                 AND (approval_end IS NULL OR approval_end >= approval_start)))""")

    for old_sig in (
        "fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer, text, text, text, jsonb)",
        "fn_admin_list_cycles(uuid)",
        "fn_nomination_decide(uuid, uuid, boolean, text)",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {old_sig}")
    for name in (
        "0032_fn_admin_upsert_award.sql",
        "0032_fn_admin_list_cycles.sql",
        "0032_fn_nomination_decide.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer, text, text, text, jsonb, date, date)")
    op.execute("DROP FUNCTION IF EXISTS fn_admin_list_cycles(uuid)")
    op.execute("DROP FUNCTION IF EXISTS fn_nomination_decide(uuid, uuid, boolean, text)")
    # restore the pre-0032 bodies
    for name in (
        "0029_fn_admin_upsert_award.sql",
        "0029_fn_admin_list_cycles.sql",
        "0031_fn_nomination_decide.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))
    op.execute(r"""
    ALTER TABLE awards
      DROP CONSTRAINT IF EXISTS awards_approval_window_check,
      DROP COLUMN IF EXISTS approval_end,
      DROP COLUMN IF EXISTS approval_start""")
