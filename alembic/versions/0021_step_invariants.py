"""0021_step_invariants — approve-path ledger guards + skip-step semantics.

Invariants surfaced while running the verification suites on the 0020
tree (raw 23514s; the gate does not yet assert these two paths directly —
candidate future gate checks):

- fn_item_decide's decline cascade and fn_deactivate_person's offboarder skip
  marked steps 'skipped' WITH decided_at — the approval_item_step CHECK
  (pending/skipped/escalated ⇔ decided_at IS NULL) rejects that, so a
  multi-step decline and the deactivation of a pending-step owner both
  aborted, leaving money held. They now stamp decided_by and keep the reason
  in `note`, decided_at stays NULL.
- Integer share math submits points < recipient_count as zero shares
  (1 pt to 2 recipients). fn_release_recognition (auto-approve path) and
  fn_approve_recognition inserted 0-amount wallet ledger rows — now only a
  positive share posts the wallet credit; every 'to' recipient is still
  notified/recorded.
- fn_release_recognition joins the ERRCODE contract (hold_journal_missing →
  C549S) — the last of the approve/decide paths to carry project SQLSTATEs.

The PL/pgSQL function bodies live beside the revisions in
alembic/sql/functions/<revision>_<function>.sql — edit *that* file, not an
inline copy here.
"""
from pathlib import Path

from alembic import op

revision = "0021_step_invariants"
down_revision = "0020_media_asset"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    for name in (
        "0021_fn_release_recognition.sql",
        "0021_fn_approve_recognition.sql",
        "0021_fn_item_decide.sql",
        "0021_fn_deactivate_person.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))


def downgrade() -> None:
    # restore the bodies each function had at 0020 (0019 fn set + 0017 release)
    for name in (
        "0017_fn_release_recognition.sql",
        "0019_fn_approve_recognition.sql",
        "0019_fn_item_decide.sql",
        "0019_fn_deactivate_person.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))
