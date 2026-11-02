# seed/

Optional development/demo data for the Applause schema.

- `demo.sql` — staff chain (Arun L3 ← Lena L2 ← Sam L1 ← 4 employees), routing rules (≤100 auto, 101–200 → L1, >200 → L1·L2·L3), two admins, emids values, admin settings, budget policy, and 250/250 allowances for the active fiscal period.

This is **not** applied by Alembic — a fresh merge yields an empty production DB.
Run it only in dev:

```
docker compose up -d db
alembic upgrade head
docker compose exec -T db psql -U postgres -d recog < seed/demo.sql
```

Then `bash scripts/db-verify.sh` (needs demo data — the 44 checks drive the staff chain) and the pytest suite stays green either way.
