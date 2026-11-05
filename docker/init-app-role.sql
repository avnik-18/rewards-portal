-- Least-privilege dev role for the API (reviewer docker-compose comment):
-- app_rw can run queries and fn_* calls; schema/migrations stay with postgres.
-- Applies to all future objects via default-privilege grants.
-- Idempotent and safe to re-apply: db-verify's self-heal re-runs this after a
-- DROP SCHEMA CASCADE (which drops the grants but not the catalog role).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw LOGIN PASSWORD 'app_rw_local';
  ELSE
    ALTER ROLE app_rw WITH LOGIN PASSWORD 'app_rw_local';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_rw;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO app_rw;
