"""0031 — the DH approval lane on awards_nominations (Work Item #4).

The DM submits a nomination (0029); the department head reviews it and the
row THEN routes onward — approve → the admin lane, decline → back to the
nominator with the reason. Schema THIS revision adds:

- achievements jsonb + supporting_docs jsonb: the dossier the DH reads (the
  DM's supporting links + bullet wins beside the story). Both default '[]'
  so the existing submission shape stays valid.
- decision_note text: the rejection reason (approve carries no note).
- review_stage text: THE lane routing column — 'dh' (waiting on the
  department head) → 'admin' (approved by the DH, staged for the wired
  admin-decision step — the NEXT work item) → 'done' (declined; final).
  CHECK-pinned; backfill maps the existing status vocabulary.

fns (bodies in alembic/sql/functions/, per the ADR convention):
- fn_submit_nomination EXTENDED (+p_achievements/+p_docs params with
  defaults; rows now enter the lane at review_stage='dh'). The 0029
  four-param signature is dropped pro-actively so no stale overload lingers.
- fn_nomination_decide: one verdict fn for the DH lane — approve/decline
  with the note contract; decline_note_required reuses the registered
  C549L; the already-decided gate reuses the C5495 dynamic raise
  ('item_already_decided'); item_not_found reuses C549M. No new SQLSTATEs.

Sample/demo nomination rows for the lane live in seed/demo.sql (per the
seed contract: migrations ship the schema, demo.sql the demo data)."""

from pathlib import Path

from alembic import op

revision = "0031_award_nomination_approvals"
down_revision = "0030_cheers_direct_values"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute(r"""
    ALTER TABLE awards_nominations
      ADD COLUMN achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN supporting_docs jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN decision_note text,
      ADD COLUMN review_stage text
        CONSTRAINT awards_nom_stage_check
        CHECK (review_stage IN ('dh', 'admin', 'done'))""")
    # submitted rows belong to the DH lane two backfills from now on — the
    # default covers fresh inserts; this maps the vocabulary already in the
    # table (none in a fresh database, but never guess)
    op.execute(r"""
    UPDATE awards_nominations
       SET review_stage = CASE status
             WHEN 'submitted' THEN 'dh'
             WHEN 'returned' THEN 'done'
             ELSE 'done'
           END""")

    for old_sig in (
        "fn_submit_nomination(uuid, uuid, uuid, text)",
    ):
        op.execute(f"DROP FUNCTION IF EXISTS {old_sig}")
    for name in (
        "0031_fn_submit_nomination.sql",
        "0031_fn_nomination_decide.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS fn_nomination_decide(uuid, uuid, boolean, text)")
    op.execute("DROP FUNCTION IF EXISTS fn_submit_nomination(uuid, uuid, uuid, text, jsonb, jsonb)")
    # restore the pre-0031 submission fn (the 0029 body)
    op.execute((SQL_DIR / "0029_fn_submit_nomination.sql").read_text(encoding="utf-8"))
    op.execute(r"""
    ALTER TABLE awards_nominations
      DROP CONSTRAINT IF EXISTS awards_nom_stage_check,
      DROP COLUMN IF EXISTS review_stage,
      DROP COLUMN IF EXISTS decision_note,
      DROP COLUMN IF EXISTS supporting_docs,
      DROP COLUMN IF EXISTS achievements""")
