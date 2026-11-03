"""0003_people_team — Alembic revision (canonical; converted once from the design workspace, then maintained here — edit this file, not the design copy)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "0003_people_team"
down_revision = "0002_enums"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    CREATE TABLE users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_code text UNIQUE NOT NULL,
      email         text NOT NULL CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
      external_id   text,
      full_name     text NOT NULL,
      title         text,
      department    text,
      avatar_url    text,
      joined_on     date,
      manager_id    uuid REFERENCES users(id) ON DELETE SET NULL,
      manager_effective_from date NOT NULL DEFAULT now(),
      employment_status person_status NOT NULL DEFAULT 'active',
      source        person_source NOT NULL DEFAULT 'internal',
      recognition_eligible boolean,
      recognition_eligible_effective_from date,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX users_lower_email_uniq ON users (lower(email));
    CREATE INDEX users_status_idx ON users (employment_status);
    CREATE INDEX users_manager_idx ON users (manager_id);
    CREATE INDEX users_external_idx ON users (external_id) WHERE external_id IS NOT NULL;

    CREATE TABLE teams (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name          text UNIQUE NOT NULL,
      code          text UNIQUE,
      project_name  text,
      description   text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE team_members (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id    uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       team_member_role NOT NULL DEFAULT 'member',
      valid_from date NOT NULL DEFAULT now(),
      valid_to   date
    );
    CREATE INDEX team_members_user_idx ON team_members (user_id);
    CREATE INDEX team_members_team_idx ON team_members (team_id);
    CREATE INDEX team_members_open_idx ON team_members (team_id, role) WHERE valid_to IS NULL;
    -- at most one OPEN membership of a user in a team
    CREATE UNIQUE INDEX team_members_open_uniq ON team_members (team_id, user_id) WHERE valid_to IS NULL;
    -- at most one OPEN lead per team
    CREATE UNIQUE INDEX team_members_lead_uniq ON team_members (team_id) WHERE valid_to IS NULL AND role = 'lead';

    CREATE TABLE role_assignment (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role       app_role NOT NULL,
      granted_by uuid REFERENCES users(id),
      granted_at timestamptz NOT NULL DEFAULT now(),
      revoked_at timestamptz
    );
    CREATE UNIQUE INDEX role_assignment_open_uniq ON role_assignment (user_id, role) WHERE revoked_at IS NULL;

    CREATE OR REPLACE FUNCTION trg_touch_updated_at() RETURNS trigger AS $$
    BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql""")
    op.execute(r"""
    CREATE TRIGGER users_touch BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at();
    CREATE TRIGGER teams_touch BEFORE UPDATE ON teams
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at()""")

def downgrade() -> None:
    op.execute(r"""
    DROP TRIGGER IF EXISTS teams_touch ON teams;
    DROP TRIGGER IF EXISTS users_touch ON users;
    DROP FUNCTION IF EXISTS trg_touch_updated_at();
    DROP TABLE IF EXISTS role_assignment;
    DROP TABLE IF EXISTS team_members;
    DROP TABLE IF EXISTS teams;
    DROP TABLE IF EXISTS users""")
