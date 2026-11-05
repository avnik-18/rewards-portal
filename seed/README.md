# seed/

Optional development/demo data for the schema.

- `demo.sql` — staff chain (Arun L3 ← Lena L2 ← Sam L1 ← 4 employees + the
  E-009 program admin), routing rules (≤100 auto, 101–200 → L1, >200 →
  L1·L2·L3), three admin role assignments, emids values, admin settings,
  budget policy, allowances for the active fiscal period, and the three demo
  media placements. Also mirrored in `docs/db/design-source/demo-seed.sql`.

This is **not** applied by Alembic — a fresh merge yields an empty production DB.
Run it only in dev:

```
docker compose up -d
alembic upgrade head
docker compose exec -T db psql -U postgres -d recog < seed/demo.sql
```

Then `bash scripts/db-verify.sh` — the 49-check gate needs the demo data to
drive the staff chain.
