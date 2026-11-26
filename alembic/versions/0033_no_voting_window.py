"""0033 — no-voting pipeline + the date-driven award phase engine.

The app's pipeline is NOMINATIONS → DH approval → ADMIN approval; voting is
NOT a phase. Schema:
- awards: + nominations_start (the nomination window's open date; the close
  stays nominations_end, so the window is [start, close]), - voting_end.
- fiscal_period: - voting_close; the umbrella timeline becomes
  nominations_close → results_on (results_on's CHECK is rebuilt to anchor on
  nominations_close instead of the removed voting_close).

The phase engine (fn_awards_auto_phase, NEW): every campus read/write that
leads with a phase TICKS it first — draft→nominations when the window
arrives, draft/nominations→closed once the close date passes. "Automatically
open close phases based on the dates provided for that award" — no scheduler,
idempotent, read-time consistent. The DH approval lane keeps breathing by its
OWN window (0032) regardless of the award phase.

fns re-loaded from alembic/sql/functions/ (bodies beside the revisions):
- fn_admin_upsert_award: p_voting_end REPLACED by p_nominations_start
  (+ window sanity C549W); everything else as 0032.
- fn_admin_list_cycles: cycle timeline drops voting_close; award payload
  drops voting_end, adds nominations_start; ticks the engine.
- fn_awards_cycles_for_user: same payload swap; ticks the engine.
- fn_admin_set_award_phase: forward chain becomes
  draft→nominations→closed→result (voting gone).
- fn_submit_nomination: window checks BOTH ends (open tomorrow → closed 409).
- fn_awards_tile / fn_admin_upsert_cycle_content: live-phase sets updated.
- fn_admin_create_cycle / fn_admin_set_cycle_timeline: timeline without
  voting_close; results anchor on nominations_close.
No new SQLSTATEs; the C549 family stands."""

from pathlib import Path

from alembic import op

revision = "0033_no_voting_window"
down_revision = "0032_award_approval_window"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute(r"""
    ALTER TABLE awards
      ADD COLUMN nominations_start date,
      DROP COLUMN voting_end""")
    op.execute(r"""
    ALTER TABLE fiscal_period
      DROP CONSTRAINT IF EXISTS fiscal_period_results_check,
      DROP CONSTRAINT IF EXISTS fiscal_period_voting_close_check,
      DROP COLUMN IF EXISTS voting_close,
      ADD CONSTRAINT fiscal_period_results_check
        CHECK (results_on IS NULL
               OR (nominations_close IS NOT NULL
                   AND results_on >= nominations_close))""")

    for old_sig in (
        "fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer, text, text, text, jsonb, date, date)",
        "fn_admin_list_cycles(uuid)",
        "fn_awards_cycles_for_user(uuid)",
        "fn_admin_set_award_phase(uuid, text, uuid)",
        "fn_submit_nomination(uuid, uuid, uuid, text, jsonb, jsonb)",
        "fn_admin_create_cycle(uuid, text, date, date, date, date, date)",
        "fn_admin_set_cycle_timeline(uuid, uuid, date, date, date)",
        "fn_admin_upsert_cycle_content(uuid, text, text, text, text, uuid)",
        "fn_awards_tile()",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {old_sig}")
    for name in (
        "0033_fn_awards_auto_phase.sql",
        "0033_fn_admin_upsert_award.sql",
        "0033_fn_admin_list_cycles.sql",
        "0033_fn_awards_cycles_for_user.sql",
        "0033_fn_admin_set_award_phase.sql",
        "0033_fn_submit_nomination.sql",
        "0033_fn_admin_create_cycle.sql",
        "0033_fn_admin_set_cycle_timeline.sql",
        "0033_fn_admin_upsert_cycle_content.sql",
        "0033_fn_awards_tile.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))


def downgrade() -> None:
    for old_sig in (
        "fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer, text, text, text, jsonb, date, date)",
        "fn_admin_list_cycles(uuid)",
        "fn_awards_cycles_for_user(uuid)",
        "fn_admin_set_award_phase(uuid, text, uuid)",
        "fn_submit_nomination(uuid, uuid, uuid, text, jsonb, jsonb)",
        "fn_admin_create_cycle(uuid, text, date, date, date, date)",
        "fn_admin_set_cycle_timeline(uuid, uuid, date, date)",
        "fn_admin_upsert_cycle_content(uuid, text, text, text, text, uuid)",
        "fn_awards_tile()",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {old_sig}")
    for name in (
        "0029_fn_admin_upsert_award.sql",
        "0032_fn_admin_list_cycles.sql",
        "0029_fn_awards_cycles_for_user.sql",
        "0028_fn_admin_set_award_phase.sql",
        "0031_fn_submit_nomination.sql",
        "0029_fn_admin_create_cycle.sql",
        "0029_fn_admin_set_cycle_timeline.sql",
        "0028_fn_admin_upsert_cycle_content.sql",
        "0028_fn_awards_tile.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))
    op.execute(r"""
    ALTER TABLE fiscal_period
      DROP CONSTRAINT IF EXISTS fiscal_period_results_check,
      ADD COLUMN voting_close date,
      ADD CONSTRAINT fiscal_period_voting_close_check
        CHECK (voting_close IS NULL OR
               (nominations_close IS NOT NULL AND voting_close >= nominations_close)),
      ADD CONSTRAINT fiscal_period_results_check
        CHECK (results_on IS NULL
               OR (voting_close IS NOT NULL AND results_on >= voting_close))""")
    op.execute(r"""
    ALTER TABLE awards
      ADD COLUMN voting_end date,
      DROP COLUMN IF EXISTS nominations_start""")
