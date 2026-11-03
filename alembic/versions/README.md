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

`app/models/schema.py` is a hand-mirrored copy of the head schema — never
hand-edit it and never hand-edit tables; hand-write a new revision here.

All schema mutations go through this folder.
