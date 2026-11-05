"""0015_staff_fn — Alembic revision (canonical; converted once from the design workspace — edit this file directly)

The PL/pgSQL function bodies live beside the revisions in
alembic/sql/functions/<revision>_<function>.sql — edit *that* file, not an
inline copy here. This keeps the revision under the 200-line review limit
and gives the SQL real diffs and highlighting.
"""
from pathlib import Path

from alembic import op

revision = "0015_staff_fn"
down_revision = "0014_logs_views"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute((SQL_DIR / "0015_fn_submit_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0015_fn_release_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0015_fn_item_decide.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_item_decide(uuid, uuid, boolean, text);
    DROP FUNCTION IF EXISTS fn_release_recognition(uuid, uuid, text)""")
