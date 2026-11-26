"""0028_awards_cycle_content — admin API for awards cycles & categories (WI#1),
ported from the admin-console slice (their 0027) on top of our awards catalog.

awards_cycle_content holds the admin-authored copy shown in the portal's
"Quarterly awards" tile for a fiscal period (the DB has no place for it —
admin_setting's scalar validator can't hold structured copy). The {points}
token in headline/tagline is substituted client-side with the derived
prize_total so figures are never typed by hand.

The fn_* business rules (admin list/upsert/phase/set-content + the portal's
fn_awards_tile read) live beside the revisions in alembic/sql/functions/ —
edit *those* files, not an inline copy here.

Error-code contract (extends 0019_fn_errcodes.py — C549U was the last used
code; C549Q is REUSED for the admin fn priv gate, insufficient_privilege):
  C549W admin_validation (invalid period/prize/dates/name/headline)
  C549X award_locked (phase-side-effect window closed)
"""
from pathlib import Path

from alembic import op

revision = "0028_awards_cycle_content"
down_revision = "0027_awards_catalog"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE awards_cycle_content (
      period_id  uuid PRIMARY KEY REFERENCES fiscal_period(id) ON DELETE CASCADE,
      headline   text NOT NULL CHECK (char_length(headline) <= 200),
      tagline    text,
      cta_label  text,
      cta_url    text,
      updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER awards_cycle_content_touch BEFORE UPDATE ON awards_cycle_content
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();""")
    op.execute((SQL_DIR / "0028_fn_admin_list_cycles.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0028_fn_admin_upsert_award.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0028_fn_admin_set_award_phase.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0028_fn_admin_upsert_cycle_content.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0028_fn_awards_tile.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_awards_tile;
    DROP FUNCTION IF EXISTS fn_admin_upsert_cycle_content(uuid, text, text, text, text, uuid);
    DROP FUNCTION IF EXISTS fn_admin_set_award_phase(uuid, text, uuid);
    DROP FUNCTION IF EXISTS fn_admin_upsert_award(uuid, uuid, text, uuid, integer, date, date, boolean, uuid);
    DROP FUNCTION IF EXISTS fn_admin_list_cycles(uuid);
    DROP TRIGGER IF EXISTS awards_cycle_content_touch ON awards_cycle_content;
    DROP TABLE IF EXISTS awards_cycle_content""")
