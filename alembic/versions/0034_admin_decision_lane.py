"""0034 — the ADMIN final-approval lane (the pipeline's last link).

The pipeline is complete: DM nominates → the DH endorses (fn_nomination_decide,
review_stage 'dh'→'admin') → THE ADMIN AWARDS (this revision) → the wallet
credits the nominee. Schema unchanged — the routing column review_stage and
the statuses already exist: approve → status='result', review_stage='done';
decline → status='not_selected' (+ optional decision_note).

fn (body in alembic/sql/functions/ per convention):
- fn_nomination_admin_decide: stage-gated verdict ('admin' else the C5495
  dynamic raise); approve ALSO executes the payout — points_wallet /
  ledger_account / journal_entry('payout', linked_award_id) /
  journal_line(debit SYS_PRIZE, credit wallet) / ledger row (the
  trg_ledger_delta trigger moves the wallet balance), mirroring the seed's
  payout and fn_approve_recognition's conventions. Idempotent by the stage
  gate: nothing can pay twice.
Routes (app layer, get_admin_id-gated):
- GET /awards/approvals/admin/pending
- PATCH /awards/nominations/{id}/admin-decision
Demo data needs nothing extra: the seed's Powerhouse Performer row already
sits at review_stage='admin' waiting on this fn."""

from pathlib import Path

from alembic import op

revision = "0034_admin_decision_lane"
down_revision = "0033_no_voting_window"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS fn_nomination_admin_decide(uuid, uuid, boolean, text)")
    op.execute((SQL_DIR / "0034_fn_nomination_admin_decide.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS fn_nomination_admin_decide(uuid, uuid, boolean, text)")
