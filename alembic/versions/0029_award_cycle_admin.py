"""0029_award_cycle_admin — admin-created award cycles + nomination limit
(WI#3), ported from the admin-console slice (their 0029, cadence moved to the
award) on top of our catalog.

Extends the 0028 awards cycle admin slice:
  - fiscal_period gains the award-cycle knobs (armed with CHECKs): the admin-set
    timeline nominations_close/voting_close/results_on. Cadence is NOT a cycle
    property — it lives on the award (our 0027_awards_catalog added it there).
  - fn_admin_create_cycle / fn_admin_set_cycle_timeline: the POST
    /admin/awards/cycles + PUT /admin/awards/cycles/{id} rules.
  - fn_admin_list_cycles redefined (same signature): cycle carries the
    timeline; awards carry max_nominations_per_nominator + the authoring
    fields (description/photo_url/cadence/guidelines).
  - fn_admin_upsert_award redefined SIGNATURE-CHANGED (+ trailing
    p_max_nominations int DEFAULT 1, p_cadence, p_description, p_photo_url,
    p_guidelines jsonb) — admin consoles author the whole portal award row.
  - fn_awards_cycles_for_user: the leader-facing read API for the portal
    "Award cycles" section (phase dates + remaining nomination allowance per
    award, viewer as nominator).
  - fn_submit_nomination: nomination submission OWNED by this slice (the
    teammate owns everything AFTER nomination — fn_finalize_award/ballots
    stay untouched). Enforces the per-category nomination limit (the race
    safety: row locks the awards row while counting the nominator's prior
    submissions) + window/eligibility/duplicate guards.

Error-code contract (extends 0019_fn_errcodes.py — C549Z was the last code):
  C5490 nomination_window_closed  (award not in nominations phase / window past)
  C549J nomination_limit_reached  (per-nominator cap for the award)
  (validation reuses C549W admin_validation; lock reuses C549X award_locked;
  nomination duplicate reuses C5495 item_already_* → 'item_already_nominated')

The fn bodies live beside the revisions in alembic/sql/functions/ —
edit *those* files, not an inline copy here.
"""

from pathlib import Path

from alembic import op

revision = "0029_award_cycle_admin"
down_revision = "0028_awards_cycle_content"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute(r"""
    ALTER TABLE fiscal_period
      ADD COLUMN nominations_close date
        CONSTRAINT fiscal_period_nominations_close_check
        CHECK (nominations_close IS NULL OR nominations_close >= starts),
      ADD COLUMN voting_close date
        CONSTRAINT fiscal_period_voting_close_check
        CHECK (voting_close IS NULL OR
               (nominations_close IS NOT NULL AND voting_close >= nominations_close)),
      ADD COLUMN results_on date
        CONSTRAINT fiscal_period_results_check
        CHECK (results_on IS NULL OR
               (voting_close IS NOT NULL AND results_on >= voting_close))""")
    # The portal tile art link is the only award column not owned by
    # 0027_awards_catalog (which already added cadence + guidelines jsonb).
    op.execute(r"""
    ALTER TABLE awards
      ADD COLUMN photo_url text""")
    # (re)definitions that replaced the 0028 bodies
    for old_sig in (
        "fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid)",
        "fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer)",
        "fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer, text, text, text, jsonb)",
        "fn_admin_create_cycle(uuid, text, text, date, date, date, date, date)",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {old_sig}")
    for name in (
        "0029_fn_admin_list_cycles.sql",
        "0029_fn_admin_create_cycle.sql",
        "0029_fn_admin_set_cycle_timeline.sql",
        "0029_fn_admin_upsert_award.sql",
        "0029_fn_awards_cycles_for_user.sql",
        "0029_fn_submit_nomination.sql",
        "0029_fn_admin_delete_award.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_admin_delete_award(uuid, uuid);
    DROP FUNCTION IF EXISTS fn_submit_nomination(uuid, uuid, uuid, text);
    DROP FUNCTION IF EXISTS fn_awards_cycles_for_user(uuid);
    DROP FUNCTION IF EXISTS fn_admin_set_cycle_timeline(uuid, uuid, date, date, date);
    DROP FUNCTION IF EXISTS fn_admin_create_cycle(uuid, text, date, date, date, date, date);
    DROP FUNCTION IF EXISTS fn_admin_list_cycles(uuid);
    DROP FUNCTION IF EXISTS fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid, integer, text, text, text, jsonb);""")
    # restore the pre-0029 definitions of the two redefined fns (0028 bodies)
    op.execute((SQL_DIR / "0028_fn_admin_list_cycles.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0028_fn_admin_upsert_award.sql").read_text(encoding="utf-8"))
    op.execute(r"""
    ALTER TABLE awards
      DROP COLUMN IF EXISTS photo_url""")
    op.execute(r"""
    ALTER TABLE fiscal_period
      DROP CONSTRAINT IF EXISTS fiscal_period_results_check,
      DROP CONSTRAINT IF EXISTS fiscal_period_voting_close_check,
      DROP CONSTRAINT IF EXISTS fiscal_period_nominations_close_check,
      DROP COLUMN IF EXISTS results_on,
      DROP COLUMN IF EXISTS voting_close,
      DROP COLUMN IF EXISTS nominations_close""")
