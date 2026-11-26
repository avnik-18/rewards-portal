"""0035 — the nomination module: columns the /nominations flow needs.

The nomination compose/lifecycle (scenes ported from the team's
feature/myteam-nominations branch) rides OUR approval engine, so no new
approval machinery here — only the additive columns their data model
reads/writes:
- nomination_status gains 'draft' (saved-not-submitted) and 'approved'
  (kept for status chips; our engine's final state stays 'result').
- awards_nominations: nomination_ref (NOM-FY26-nnnnnn), team_id (team
  awards), core_values (the compose chip picks), approved_at.
- awards.eligibility JSONB — the nomination service reads allow_self /
  allow_team / grades / member_level_max / departments /
  min_tenure_months to gate the compose.
- users.grade (free text 'L0'..'L6','VP','SVP'), backfilled from titles
  so the seeded demo directory grades sensibly without an HR feed.
- award_quotas: quarterly BU/DEPT/TEAM/COMPANY caps beyond the
  per-nominator cap.

ALEMBIC note: enum ADD VALUE cannot share a transaction with other DDL —
each runs alone (same pattern as 0027 upstream migrations).
"""

from alembic import op

revision = "0035_nomination_module"
down_revision = "0034_admin_decision_lane"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE nomination_status ADD VALUE IF NOT EXISTS 'draft'")
    op.execute("ALTER TYPE nomination_status ADD VALUE IF NOT EXISTS 'approved'")
    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS nomination_ref_seq START 10001
    """)
    op.execute("""
        ALTER TABLE awards_nominations
            ADD COLUMN IF NOT EXISTS nomination_ref text,
            ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS core_values jsonb NOT NULL DEFAULT '[]'::jsonb,
            ADD COLUMN IF NOT EXISTS approved_at timestamptz
    """)
    op.execute("""
        UPDATE awards_nominations SET nomination_ref =
            'NOM-FY26-' || nextval('nomination_ref_seq')
         WHERE nomination_ref IS NULL
    """)
    op.execute("ALTER TABLE awards_nominations ALTER COLUMN nomination_ref SET NOT NULL")
    # every writer (seed, the compose draft INSERT) keeps working without
    # naming the ref: the default draws one from the shared sequence
    op.execute("""
        ALTER TABLE awards_nominations
            ALTER COLUMN nomination_ref
            SET DEFAULT 'NOM-FY26-' || nextval('nomination_ref_seq')
    """)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS awards_nominations_ref_uniq"
               " ON awards_nominations (nomination_ref)")
    op.execute("ALTER TABLE awards ADD COLUMN IF NOT EXISTS eligibility jsonb")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS grade text")
    op.execute("""
        UPDATE users SET grade = CASE
            WHEN title ILIKE '%VP%' AND title NOT ILIKE '%DEVP%' THEN 'VP'
            WHEN title ILIKE '%SVP%' THEN 'SVP'
            WHEN title ILIKE '%sr%' THEN 'L3'
            WHEN title ILIKE '%head%' OR title ILIKE '%manager%'
                OR title ILIKE '%admin%' OR title ILIKE '%director%' THEN 'L5'
            WHEN title ILIKE '%lead%' THEN 'L2'
            ELSE 'L1'
        END WHERE grade IS NULL
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS award_quotas (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            award_id    uuid NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
            period_id   uuid NOT NULL REFERENCES fiscal_period(id) ON DELETE CASCADE,
            scope       text NOT NULL CHECK (scope IN ('BU','DEPT','TEAM','COMPANY')),
            scope_value text NOT NULL,
            max_count   int NOT NULL CHECK (max_count > 0),
            UNIQUE (award_id, period_id, scope, scope_value)
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS award_quotas")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS grade")
    op.execute("ALTER TABLE awards DROP COLUMN IF EXISTS eligibility")
    op.execute("""
        ALTER TABLE awards_nominations
            DROP COLUMN IF EXISTS nomination_ref,
            DROP COLUMN IF EXISTS team_id,
            DROP COLUMN IF EXISTS core_values,
            DROP COLUMN IF EXISTS approved_at
    """)
    op.execute("DROP SEQUENCE IF EXISTS nomination_ref_seq")
    # enum labels 'draft'/'approved' are additive and can no longer be dropped
    # cleanly once used — a downgrade keeps them (ALADD-enum semantics).
