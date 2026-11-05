# ADR 0001 — Business logic lives in PL/pgSQL functions

**Status:** Accepted
**Date:** 2026-11-03
**Deciders:** portal engineering team (lead-approved)

## Context

The recognition flow must guarantee double-entry integrity: holds, journals,
exactly-once refunds, approval chains and budget boundaries must be enforced
atomically under concurrent access (two approves of the same item, a submit
racing a budget edit). The approved schema (alembic/versions 0001→0021)
ships this logic as PL/pgSQL functions (`fn_submit_recognition`,
`fn_item_decide`, `fn_admin_set_budget`, `fn_allowance_seed`,
`fn_release_recognition`, `fn_deactivate_person`).

The question: where does this logic live going forward — in the PL/pgSQL
functions (this repo's migrations), or mirrored in a Python service layer
(the original scaffold design, in which fn stubs were placeholders before
the DB workstream landed)?

## Decision

Business logic lives in the DATABASE functions. The API layer stays a thin
adapter: routers validate DTOs → services adapt/translate (including the
fn error-code contract via `RecognitionDomainError` + `_error_code`) →
repositories execute plain SQL. There is no Python mirror of the business
rules; service-layer stubs (`approval_service`, `wallet_service`,
`reports_service`) are deleted.

## Costs we accept (per the lead's review request, written down explicitly)

1. **Reviewing a logic change means diffing whole function bodies across
   migrations.** `fn_submit_recognition` is (re)defined in 0008, 0015,
   0017 and 0019 — a logic change lands as a NEW migration whose body is a
   near-complete copy with the change inside; the diff is noisy.
   *Mitigations:* each revision carries the change docstring + a focused
   RAISE-contract entry; the function bodies live in editable source files —
   `alembic/sql/functions/<revision>_<function>.sql` — loaded by
   one-line revision loaders, so diffs and highlighting work and there is
   no inline copy to drift (see `alembic/versions/README.md`); the
   transition bridge lives in exactly one file
   (`recognition_service._error_code`) and is deleted once 0019 is deployed
   everywhere; future fn bodies are kept single-purpose so bodies stay small.

2. **Unit testing the logic needs a live database.** There is no Python-side
   fixture that exercises routing/money math.
   *Mitigations:* `scripts/db-verify.sh` (49 invariant checks incl. 2 race
   tests) is the logic gate; integration tests run against real alembic-built
   DBs on fresh scratch instances (the PR-verification playbook); a
   developer's local DB is one `docker compose up` + `alembic upgrade head`
   away. `pytest tests/` remains the API-layer gate and does NOT need the DB
   except for the marked `DB_READY` integration files.

## Consequences of the chosen design

- Integrity: ledger/journal invariants cannot be bypassed by any language,
  process, or future service — enforced at the last line of defense.
- One transaction boundary per business operation, no two-phase logic
  between service and DB.
- Python migrations are SQL-first; `app/models/` (one module per bounded
  context, re-exported from `app/models/__init__.py`) hand-mirrors the head
  schema for ORM/intellisense and is never a schema source.
- Contract drift risk (UI expectations vs fn semantics) is covered by the
  OpenAPI contract + `db-verify` invariants.

## Alternatives considered

- **Application-layer logic (service mirrors the fn rules):** rejected —
  duplicates the integrity rules in two languages, loses the atomic CAS
  under concurrency, and would require advisory locks or SELECT FOR UPDATE
  choreography to re-attain what Postgres gives natively here.
- **Hybrid (thin SQL + Python orchestration):** rejected for v1 — it
  reintroduces a two-language split exactly where atomicity matters;
  revisit only if a flow ever needs an external transaction boundary
  (e.g., third-party payout APIs).

## Conformance

- New feature PRs: business rules → a new fn revision; API routes stay thin.
- The fn body in `alembic/sql/functions/` is the SOURCE OF TRUTH;
  `app/models/` mirrors it for the ORM, never the reverse.
- `CLAUDE.md` is updated to match (this file is the reference).
