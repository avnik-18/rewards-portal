"""0014_logs_views — Alembic revision (canonical; converted once from the design workspace — edit this file directly)
"""
from alembic import op

revision = "0014_logs_views"
down_revision = "0013_fn_flows"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute(r"""
    -- job_run (system_log partitions follow the same native pattern; pg_partman deferred)
    CREATE TABLE job_run (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      job_name    text NOT NULL,
      started_at  timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz,
      status      job_status NOT NULL DEFAULT 'running',
      rows_affected int,
      error       text,
      context     jsonb
    );
    CREATE UNIQUE INDEX job_run_running_uniq ON job_run (job_name) WHERE status = 'running';
    CREATE INDEX job_run_recent_idx ON job_run (job_name, started_at DESC);

    -- system_log: native range-partitioned (partition key in PK)
    CREATE TABLE system_log (
      at         timestamptz NOT NULL DEFAULT now(),
      id         bigint NOT NULL DEFAULT nextval(pg_get_serial_sequence('job_run','id')::text)::bigint,
      level      log_level NOT NULL,
      service    text NOT NULL,
      message    text NOT NULL,
      user_id    uuid REFERENCES users(id),
      request_id text,
      error_code text,
      context    jsonb,
      hostname   text,
      deploy_sha text
    )""")
    op.execute(r"""
    DROP TABLE IF EXISTS system_log CASCADE;
    CREATE SEQUENCE system_log_id_seq;
    CREATE TABLE system_log (
      at         timestamptz NOT NULL DEFAULT now(),
      id         bigint NOT NULL DEFAULT nextval('system_log_id_seq'),
      level      log_level NOT NULL,
      service    text NOT NULL,
      message    text NOT NULL,
      user_id    uuid REFERENCES users(id),
      request_id text,
      error_code text,
      context    jsonb,
      hostname   text,
      deploy_sha text,
      PRIMARY KEY (at, id)
    ) PARTITION BY RANGE (at);
    CREATE TABLE system_log_default PARTITION OF system_log DEFAULT;

    -- reading views
    CREATE VIEW vw_directory AS
      SELECT id, full_name, title, department, avatar_url FROM users;

    CREATE VIEW vw_ledger_person AS
      SELECT id, user_id, amount, kind,
             CASE WHEN kind = 'recognition_hold'
                  THEN 'Recognition pending approval' ELSE label END AS label,
             created_at
        FROM ledger;

    CREATE VIEW vw_team_stats AS
      SELECT tm.team_id, tm.user_id, rr.kind,
             SUM(rr.points) AS points_this_period
        FROM team_members tm
        LEFT JOIN recognition_recipients rr ON rr.user_id = tm.user_id AND rr.kind='to'
       WHERE tm.valid_to IS NULL
       GROUP BY tm.team_id, tm.user_id, rr.kind;

    CREATE VIEW vw_wallet_reconcile AS
      SELECT pw.id AS wallet_id, pw.user_id, pw.balance,
             COALESCE(SUM(l.amount), 0) AS ledger_sum, pw.balance - COALESCE(SUM(l.amount),0) AS drift
        FROM points_wallet pw
        LEFT JOIN ledger l ON l.points_wallet_id = pw.id
       GROUP BY pw.id""")

def downgrade() -> None:
    op.execute(r"""
    DROP VIEW IF EXISTS vw_wallet_reconcile;
    DROP VIEW IF EXISTS vw_team_stats;
    DROP VIEW IF EXISTS vw_ledger_person;
    DROP VIEW IF EXISTS vw_directory;
    DROP TABLE IF EXISTS system_log_default;
    DROP TABLE IF EXISTS system_log;
    DROP SEQUENCE IF EXISTS system_log_id_seq;
    DROP TABLE IF EXISTS job_run""")
