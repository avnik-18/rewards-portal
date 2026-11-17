"""0022_fn_submit_refs — reference guards on fn_submit_recognition.

Value/template supplies the composer UI makes on the recognize flow. The
body executes from alembic/sql/functions/0022_fn_submit_recognition.sql;
only the submit fn is redefined here — every other fn stays at its prior
definition (0019/0021).

Approved codes (List A):
  C5497 value_not_found          → API 404
  C5498 template_not_found       → API 404
  C5499 template_value_mismatch  → API 422

The recipient/art/status/routing paths carry over unchanged from 0019, so
the demo recognitions previously created via the fn continue to hold their
approval items as seeded (only the two reference checks sit in between).
"""
from pathlib import Path

from alembic import op

revision = "0022_fn_submit_refs"
down_revision = "0021_step_invariants"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute((SQL_DIR / "0022_fn_submit_recognition.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    # restore the 0019 definition — no data changes ever happened in 0022, the
    # guards are pure validation in front of the existing INSERT.
    op.execute((SQL_DIR / "0019_fn_submit_recognition.sql").read_text(encoding="utf-8"))
