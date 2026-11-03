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

**Status: core slice live + deployed-concept reviewed.** 19 Alembic revisions
(schema incl. fn_* business functions) + recognition/approval API on
`feature/initial-backend` (verified: `verify.sh` + 44-check DB gate +
21 pytest). PR under review by the lead; re-review fixes are landing as
separate commits on the same branch.

## Where the business logic lives — DECIDED

**In the database — PL/pgSQL functions**, not in Python services.
Decision recorded in **`docs/adr/0001-business-logic-in-pl-pgsql.md`** (read
it before touching routing/chain/ledger logic — it also records the accepted
costs: reviewing a fn change = diffing whole bodies across migrations;
testing the logic needs a live DB, covered by `db-verify.sh` + integration
tests on scratch DBs).

Consequences for daily work:

- `app/api/v1/` + `app/services/` + `app/repositories/` are a **thin
  adapter**: routers validate DTOs; services are pure DTO adapters with NO
  business rules; repositories are SQL-only (fn calls + reads). There is no
  Python mirror of routing/chain/ledger math — do not (re)introduce one.
- The old service stubs (`approval_service.py`, `wallet_service.py`,
  `reports_service.py`) are DELETED. To change business rules: hand-write a
  new Alembic revision that redefines the fn; `app/models/schema.py` is a
  generated mirror, never hand-edit.
- fn error semantics contract: fns raise with `USING ERRCODE = 'C549xx'`
  (mapping table `_SQLSTATE_TO_CODE` in
  `app/services/recognition_service.py`), surfaced app-wide by the
  RecognitionDomainError handler.
- Delegated approvals (`approval_delegation`) are **out of scope for the
  initial-backend PR** (documented in `ApplauseRepository.pending_approvals`),
  tracked as a recognition_db revision.

## Non-negotiable architecture rules

- **Layered, one direction only:** router (`app/api/v1/`) → service
  (`app/services/`) → repository (`app/repositories/`). Routers validate
  DTOs and never hold logic; repositories hold SQL and never raise HTTP
  errors; services are single-purpose adapters, never FastAPI request objects.
- **Transactions: once per request, owned by the session dependency**
  (`app/db/session.py::get_session` — commit on success, rollback + re-raise
  on failure). **Repositories never commit or roll back.** Multi-write
  futures (outbox, audit, notification) join the same unit of work.
- **Pydantic DTOs** in `app/schemas/`, named `XxxRequest` / `XxxResponse`.
- **All schema changes via Alembic** (`alembic/versions/`). Never CREATE
  TABLE by hand, never sync from a dumped schema; fn bodies are SQL-first
  (see the ADR).
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
alembic upgrade head        # apply migrations
scripts/db-verify.sh        # 44-check DB gate (invariants + races)
```

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
  HRIS manager chain to the first level whose limit covers the points; quota wallet
  owner is the final mandatory step, whatever their level.

## Email

**Microsoft Graph sendMail only** (`app/notifications/email.py`,
client-credentials flow on the noreply mailbox). **No SMTP** — Microsoft 365
basic-auth SMTP is disabled in most tenants; the LogEmailSender fallback is the
intended local-dev path, not a bug to fix.

## Tests

- Unit: `tests/unit/` (pytest + TestClient). Target 90% coverage as business
  adapters land.
- Integration: `tests/integration/` runs against a live alembic-built DB
  (DB_READY-gated; on fresh scratch DBs in the PR playbook).
- Playwright (`tests/playwright/`) is for integration; `tests/playwright/smoke.spec.ts`
  is empty until the Next.js UI repo exists.
- Prefer structural/invariant assertions (e.g. "wallet debit inside limits",
  "chain ends at wallet owner") over seed-value-sniffing.

## Gotchas

- `docker-compose.yml` serves **local dev defaults** only (postgres/postgres);
  real values never go there — use `.env`.
- `db/session.py` is also the unit-of-work boundary (see "Transactions").
- The commit hooks are `pre-commit` (Python equivalent of the "husky" ask);
  same behaviour — ruff, mypy, pylint naming, bandit, pytest, trivy if present.
- Postgres always lives in **its own container**, never inside the api image.
- `str` paths and repo drift: fn bodies change via NEW migrations — never edit
  already-applied revisions (reviewer ADR + policy).
