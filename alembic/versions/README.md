# Migration versions

The Alembic revisions in this folder are the **canonical schema owner** for the
rewards-portal-api database — `alembic upgrade head` is the only way the schema is
built or changed. `docs/db/design-source/` is the historical design workspace
(from which these revisions were converted once); it is reference material
only — never apply the design copy to a database.

- Revisions run through `op.execute(...)` on the migration env's connection, so
  every upgrade/downgrade is a single Alembic transaction: a failure rolls the
  schema back *and* leaves `alembic_version` untouched (safe to re-run).
- Offline review (`alembic upgrade head --sql`) emits the full SQL.
- Large PL/pgSQL function bodies live in `alembic/sql/functions/<revision>_<function>.sql`
  and are loaded with `op.execute((SQL_DIR / ...).read_text())` — edit that file
  when changing a function; the revision just wires it in.

`app/models/` mirrors the head schema one module per bounded context
(people / money / recognition / approvals / awards / config_audit) — never
hand-edit tables; hand-write a new revision here.

All schema mutations go through this folder.
