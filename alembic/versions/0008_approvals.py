"""0008_approvals — Alembic revision (canonical; converted once from the design workspace — edit this file directly)

The PL/pgSQL function/trigger bodies live beside the revisions in
alembic/sql/functions/<revision>_<function>.sql — edit *that* file, not an
inline copy here. Table DDL stays inline; this keeps the revision under the
200-line review limit and gives the SQL real diffs and highlighting.
"""
from pathlib import Path

from alembic import op

revision = "0008_approvals"
down_revision = "0007_recognition"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE approval_rule (
      id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind      approval_kind NOT NULL,
      version   int NOT NULL DEFAULT 1,
      condition jsonb,
      min_points int CHECK (min_points IS NULL OR min_points >= 0),
      max_points int,
      priority  int NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      version_note text,
      created_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (max_points IS NULL OR min_points IS NULL OR max_points >= min_points)
    );
    CREATE UNIQUE INDEX approval_rule_kind_priority_uniq ON approval_rule (kind, priority) WHERE is_active;""")

    op.execute((SQL_DIR / "0008_validate_rule_condition.sql").read_text(encoding="utf-8"))

    op.execute(r"""
    CREATE TRIGGER trg_rule_condition BEFORE INSERT OR UPDATE ON approval_rule
      FOR EACH ROW EXECUTE FUNCTION validate_rule_condition();""")

    op.execute(r"""
    CREATE TABLE approval_rule_step (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_id     uuid NOT NULL REFERENCES approval_rule(id) ON DELETE CASCADE,
      seq         smallint NOT NULL CHECK (seq >= 1),
      level       approval_level NOT NULL,
      subject     approver_subject NOT NULL,
      fixed_user_id uuid REFERENCES users(id),
      mode        approver_mode NOT NULL DEFAULT 'ANY',
      sla_hours   int,
      escalation_target text CHECK (escalation_target IN ('fp_manager','fixed_sys_admin')),
      CHECK (subject <> 'fixed_user' OR fixed_user_id IS NOT NULL),
      CHECK (level <> 'FINANCE' OR subject = 'fixed_user'),
      UNIQUE (rule_id, seq)
    );

    CREATE TABLE approval_item (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind approval_kind NOT NULL,
      submitter_id uuid NOT NULL REFERENCES users(id),
      version int NOT NULL DEFAULT 1,
      resubmitted_from uuid REFERENCES approval_item(id),
      rule_id uuid REFERENCES approval_rule(id),
      rule_version int,
      recognition_id uuid REFERENCES recognition_history(id) ON DELETE CASCADE,
      nomination_id uuid,
      snapshot jsonb NOT NULL,
      status approval_status NOT NULL DEFAULT 'pending',
      decided_by uuid REFERENCES users(id),
      decided_at timestamptz,
      idempotency_key uuid UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (
        (kind = 'points_recognition' AND recognition_id IS NOT NULL AND nomination_id IS NULL)
        OR (kind = 'award_endorsement' AND nomination_id IS NOT NULL AND recognition_id IS NULL)
      ),
      CHECK ((status IN ('approved','returned','declined','cancelled'))
             = (decided_by IS NOT NULL AND decided_at IS NOT NULL))
    );
    CREATE INDEX approval_item_pending_idx ON approval_item (status) WHERE status = 'pending';
    CREATE INDEX approval_item_submitter_idx ON approval_item (submitter_id);
    CREATE UNIQUE INDEX approval_item_resubmit_uniq ON approval_item (resubmitted_from)
      WHERE resubmitted_from IS NOT NULL;

    CREATE TABLE approval_item_step (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      approval_item_id uuid NOT NULL REFERENCES approval_item(id) ON DELETE CASCADE,
      seq smallint NOT NULL CHECK (seq >= 1),
      owner_id uuid NOT NULL REFERENCES users(id),
      mode approver_mode NOT NULL DEFAULT 'ANY',
      sla_due timestamptz,
      status step_status NOT NULL DEFAULT 'pending',
      decided_by uuid REFERENCES users(id),
      decided_at timestamptz,
      note text,
      UNIQUE (approval_item_id, seq, owner_id),
      CHECK (status IN ('pending','skipped','escalated') = (decided_at IS NULL)),
      CHECK (status <> 'declined' OR note IS NOT NULL)  -- B3 mandatory reasons
    );
    CREATE INDEX approval_item_step_pending_idx ON approval_item_step (owner_id, status)
      WHERE status = 'pending'""")

    op.execute((SQL_DIR / "0008_coi_backstop.sql").read_text(encoding="utf-8"))
    op.execute(r"""
    CREATE TRIGGER trg_coi_backstop BEFORE INSERT OR UPDATE OF status, owner_id ON approval_item_step
      FOR EACH ROW EXECUTE FUNCTION coi_backstop();

    CREATE TRIGGER item_touch BEFORE UPDATE ON approval_item
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at()""")
    op.execute((SQL_DIR / "0008_fn_submit_recognition.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(r"""
    DROP FUNCTION IF EXISTS fn_submit_recognition;
    DROP TRIGGER IF EXISTS trg_coi_backstop ON approval_item_step;
    DROP FUNCTION IF EXISTS coi_backstop();
    DROP TRIGGER IF EXISTS item_touch ON approval_item;
    DROP TABLE IF EXISTS approval_item_step;
    DROP TABLE IF EXISTS approval_item;
    ALTER TABLE journal_entry DROP CONSTRAINT IF EXISTS journal_entry_linked_recognition_fk;
    DROP TABLE IF EXISTS approval_rule_step;
    DROP TRIGGER IF EXISTS trg_rule_condition ON approval_rule;
    DROP FUNCTION IF EXISTS validate_rule_condition();
    DROP TABLE IF EXISTS approval_rule""")
