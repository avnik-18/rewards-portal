# CLAUDE.md — rewards-portal-api

Instructions for any Claude Code session working in this repository.

**GitHub:** `EMIDS-Data-AI-Engineering/rewards-portal-api`.
Working branches: PRs → `develop` → `main` as release. Do not push directly to `develop`.

## What this is

FastAPI backend for the emids rewards & recognition portal. The approved
database schema lives in THIS repo (`alembic/versions/` — the recog-db
workstream's deliverable, folded in after its design phase). Front-end:
`rewards_recog` (the Vite PoC) being migrated to Next.js by the UI team —
read its screen source for domain rules, never `data.ts` (retired as a spec).
This repo is the **only** thing allowed to talk to Postgres.

**Status: core slice live.** Approved schema (18 revisions) + recognition/
approval API are merged on `develop` (verified: `verify.sh` + 44-check
DB gate). Stub map below tracks what remains.

## Non-negotiable architecture rules

- **Layered, one direction only:** router (`app/api/v1/`) → service
  (`app/services/`) → repository (`app/repositories/`). Routers validate
  DTOs and never hold logic; repositories hold SQL and never raise HTTP
  errors; services are single-purpose and receive plain data/DTOs, never
  FastAPI request objects.
- **Pydantic DTOs** in `app/schemas/`, named `XxxRequest` / `XxxResponse`.
- **All schema changes via Alembic** (`alembic/versions/`). Never CREATE
  TABLE by hand, never sync from a dumped schema.
- **Secrets only via env** (`app/core/config.py` Settings). Never hardcode,
  never commit `.env`.
- **Logging = structlog** (`app/core/logging.get_logger`). No `print`, no
  bare `logging.getLogger`.
- **mypy strict** — code must pass `mypy app` clean.
- **Scripts hygiene (post-review policy)** — anything committed to `scripts/` must run on
  any machine: never absolute personal paths (use `cd "$(dirname "$0")/.."`), never
  destructive git operations (`push --force`, `reset --hard`) against shared branches,
  never secrets. One-off operator commands are run OUTSIDE the repo and deleted, not
  committed. Branch history is the only place a mistake may live — never shared state.
- **Descriptive names, enforced by linters** — pylint's naming gate runs in
  pre-commit on every file: `snake_case` functions/variables, `CapWords`
  classes, `UPPER_CASE` module constants, no single-letter names outside the
  documented `good-names` list (i/j/k loop counters, `e` exceptions, `id`,
  `db`, `_`). Names must say what they hold/return (`actor_id`,
  `pending_steps`, not `x`, `tmp`, `data2`). Renames always via `ruff --fix`
  or IDE so grep stays green.

## Commands

```
pip install -e ".[dev]"     # after python -m venv .venv && .venv\Scripts\activate
pytest -q                   # unit tests (tests/unit)
ruff check . && ruff format .
mypy app
bandit -r app
docker compose up --build   # api + postgres
alembic upgrade head        # apply migrations (once they exist)
```

## Stub map (blocked on the DB team's schema)

| Stub | File | Unblocks when |
|---|---|---|
| Approval chains (L1/L2/L3 limits, personal budget, wallet owner last) | `app/services/approval_service.py` | person, level_limit, wallet tables |
| Wallets (quarterly L1/L2/L3 assignment, used/unused tracking, idempotent spends) | `app/services/wallet_service.py` | wallet, point_lot, ledger_entry tables |
| Employee history/performance | `app/services/reports_service.py` | ledger_entry, post tables |
| Repository pattern methods | `app/repositories/demo_repository.py` | first migration |
| Entra JWT validation | `app/core/security.py::_validate_entra_jwt` | org App registration values |
| Alembic autogenerate target | `alembic/env.py` (target_metadata=None) | `app/models/` Base exists |

When tables land: create `app/models/`, set `alembic/env.py` target_metadata,
generate the first migration, then replace stubs — in that order.

## Domain semantics (from rewards_recog — keep these true)

- **Points-only system.** No currency anywhere (no ₹ columns, no INR pricing,
  no procurement/money wallets) — that was dropped from scope. Redemption
  catalog items are priced purely in points. If a points↔currency bridge is
  ever required, it gets added as one config decision later; don't invent
  rupee columns "just in case".
- Balance is **derived from the append-only ledger**, never a stored editable column.
- Points expire after 12 months (lots).
- Leaderboard = peer points **received** per quarter, excluding EoQ prize payouts.
- Approval chain: personal-budget praise skips review; above that, walk the giver's
  HRIS manager chain to the first level whose limit covers the points; quota-wallet
  owner is the final mandatory step, whatever their level.

## Email

**Microsoft Graph sendMail only** (`app/notifications/email.py`,
client-credentials flow on the noreply mailbox). **No SMTP** — Microsoft 365
basic-auth SMTP is disabled in most tenants; the LogEmailSender fallback is the
intended local-dev path, not a bug to fix.

## Tests

- Unit: `tests/unit/` (pytest + TestClient). Target 90% coverage as business
  logic lands — the scaffold baseline is deliberately small.
- Playwright (`tests/playwright/`) is for integration; `tests/playwright/smoke.spec.ts`
  is empty until the Next.js UI repo exists.
- Prefer structural/invariant assertions (e.g. "wallet debit inside limits",
  "chain ends at wallet owner") over seed-value-sniffing.

## Gotchas

- `docker-compose.yml` serves **local dev defaults** only (postgres/postgres);
  real values never go there — use `.env`.
- `db/session.py` resolves the engine lazily via `get_settings()` so tests run
  without a live DB.
- The commit hooks are `pre-commit` (Python equivalent of the "husky" ask);
  same behaviour — ruff, mypy, bandit, pytest, trivy if present.
- Postgres always lives in **its own container**, never inside the api image.
