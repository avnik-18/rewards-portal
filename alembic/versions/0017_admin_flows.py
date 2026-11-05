"""0017_admin_flows — Alembic revision (canonical; converted once from the design workspace — edit this file directly)

The PL/pgSQL function bodies live beside the revisions in
alembic/sql/functions/<revision>_<function>.sql — edit *that* file, not an
inline copy here. Tables stay inline; this keeps the revision under the
200-line review limit and gives the SQL real diffs and highlighting.
"""
from pathlib import Path

from alembic import op

revision = "0017_admin_flows"
down_revision = "0016_step_level"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute((SQL_DIR / "0017_fn_notify.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0017_fn_rule_matches.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0017_fn_submit_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0017_fn_release_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0017_fn_admin_set_budget.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0017_fn_deactivate_person.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0017_fn_relay_outbox.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    # fn_submit_recognition and fn_release_recognition PREDATE 0017 (0008/0015
    # created them; 0017 only redefined them) — downgrade restores their 0015
    # definitions instead of dropping shared functions wholesale.
    op.execute((SQL_DIR / "0015_fn_submit_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0015_fn_release_recognition.sql").read_text(encoding="utf-8"))
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_relay_outbox;
    DROP FUNCTION IF EXISTS fn_deactivate_person;
    DROP FUNCTION IF EXISTS fn_admin_set_budget;
    DROP FUNCTION IF EXISTS fn_notify;
    DROP FUNCTION IF EXISTS fn_rule_matches""")
