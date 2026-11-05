"""0019_fn_errcodes — recreate fn_* with USING ERRCODE business codes.

Every business raise in the fn bodies THIS revision defines carries a project
SQLSTATE (primary messages unchanged) so the API maps on e.orig.sqlstate —
one table (_SQLSTATE_TO_CODE on the API lane), no
message-prefix parsing. Custom SQLSTATEs are five characters (PG limit):

  C5491 insufficient_points           C5492 person_inactive
  C5493 double_refund_blocked         C5494 self_recognition_blocked
  C5495 item_already_<status>         C5496 points_out_of_range
  C549A recipient_not_found           C549B guest_cannot_receive
  C549C recipient_total_mismatch      C549D no_allowance_for_period
  C549E allocation_below_spent        C549F no_approval_route
  C549G approver_unresolvable_at_     C549H not_pending_for_decider
  C549K prize_pool_empty              C549L decline_note_required
  C549M item_not_found                C549N person_not_found
  C549P self_admin_blocked            C549Q insufficient_privilege
  C549R account_not_found             C549S hold_journal_missing
  C549T hold_lines_missing            C549U no_budget_policy

fn_item_decide is redefined here for the first time under the contract;
0008/0015's message-only raises predate it. Known contract gaps while those
fns are only redefined by a later revision: paths left on pre-contract
definitions — the auto-approve hold journal via 0017's fn_release_recognition
and fn_finalize_award in 0009_awards (its raises are message-only; C549K is
pre-mapped for that day).

The PL/pgSQL function bodies live beside the revisions in
alembic/sql/functions/<revision>_<function>.sql — edit *that* file, not an
inline copy here.
"""
from pathlib import Path

from alembic import op

revision = "0019_fn_errcodes"
down_revision = "0018_admin_fallback"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    for name in (
        "0019_fn_submit_recognition.sql",
        "0019_fn_approve_recognition.sql",
        "0019_fn_decline_recognition.sql",
        "0019_fn_item_decide.sql",
        "0019_fn_admin_set_budget.sql",
        "0019_fn_allowance_seed.sql",
        "0019_fn_deactivate_person.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))


def downgrade() -> None:
    # restore each function to the definition in force just before 0019:
    # 0017 (submit / admin budget / deactivate), 0013-era
    # (approve / decline / allowance seed), 0015 (item_decide).
    for name in (
        "0017_fn_submit_recognition.sql",
        "0013_fn_approve_recognition.sql",
        "0013_fn_decline_recognition.sql",
        "0015_fn_item_decide.sql",
        "0017_fn_admin_set_budget.sql",
        "0013_fn_allowance_seed.sql",
        "0017_fn_deactivate_person.sql",
    ):
        op.execute((SQL_DIR / name).read_text(encoding="utf-8"))
