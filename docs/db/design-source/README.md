# emids Rewards & Recognition — Database Workspace ("Applause DB")

Production-style PostgreSQL 15 schema + **Alembic** migrations for the emids
Recognition & Rewards portal. Everything the portal needs lives here: schema
(30+ tables), double-entry money core, configurable approval chains,
awards/jury, admin flows, observability, seeds, verification suites — and a
thin reference REST API.

**For the API team:** `db/alembic/versions/` + `db/README.md` are the contract.
Schema invariants and the money posting recipe are encoded in SQL
triggers/functions, so the DB itself enforces most rules — your API layer
(FastAPI) should call the stored functions, not hand-write money math.

---

## 1) Quickstart (Docker + Alembic)

```bash
# 1. scratch Postgres (host port 5433 so it never collides locally)
docker run -d --name applause-pg -e POSTGRES_PASSWORD=applause_dev -p 5433:5432 postgres:15-alpine

# 2. create the database
docker exec applause-pg psql -U postgres -c "CREATE DATABASE applause"

# 3. Python env with Alembic (run from db/)
cd db && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# 4. apply all revisions
export DATABASE_URL='postgres://postgres:applause_dev@127.0.0.1:5433/applause'
.venv/bin/alembic upgrade head
```

That leaves a fully working DB with seed data: staff (L3 ← L2 ← L1 ← 4
employees), routing rules (≤100 auto-approve / 101–200 → L1 / >200 → L1·L2·L3),
the 250/qtr allowance seeded per person, emids values + templates, system
accounts, and two seeded admins.

Connection string shape (override the demo password anywhere real):
`postgres://postgres:applause_dev@127.0.0.1:5433/applause`
(sqlalchemy dialect is resolved to `postgresql+psycopg2://` in `alembic/env.py`).

## 2) Files

| File | What |
|---|---|
| `alembic/versions/0001..0007` | schema build-out: enums → people/teams → fiscal period + budget policy → wallets/journals/ledger → config → recognition + the pending-projection queue → approvals (rules/steps/items) |
| `alembic/versions/0008..0011` | awards/jury/ballots → notification + outbox → audit log → system_log + views |
| `alembic/versions/0012..0014` | seed data (periods, policy, rules incl. ≤100 auto-approve band, values, templates, staff), money flows (`fn_allowance_seed`, release/refund), logs & reconcile views |
| `alembic/versions/0015..0018` | demo org chain (Arun L3 ← Lena L2 ← Sam L1 ← employees) + routing (>100 → L1, >200 → all three), `approval_item_step.level`, admin flows (`fn_notify`, rule-condition evaluator `fn_rule_matches` wired into routing, `fn_admin_set_budget` RBAC+SoD, `fn_deactivate_person` leaver flow, outbox relay), two seeded admins for org-top fallback |
| `schema.sql` | generated DDL dump of the final schema (read-only reference — always regenerate from migrations, never edit) |
| `api.js` | thin Express reference API over the schema (see endpoints below). The real API replaces this |
| `verify.sql` | core runtime suite (22 checks): hold→release→credit, refund-exactly-once, double-spend, idempotency, self/COI blocks, payout, reconcile = 0 |
| `verify2.sql` | edge suites (20 checks): budget RBAC/SoD/clawback, leaver flow, rule conditions, notifications + outbox, all journals balanced |
| `test_race.js` | concurrency: two parallel submits draining one wallet, decide race |
| `demo-reset.sql` | wipe workflow data, re-seed fresh 250/250 allowances + accounts |
| `purge-poc.sql` | hard reset to migration-seed state (no workflow data) |
| `state.sql`, `sanity.sql`, `debug*.sql` | inspection helpers |

## 3) The invariants (what the DB guarantees you)

1. **Double-entry, append-only money**: every money event is a `journal_entry`
   + balanced `journal_line`s (deferred trigger rejects SUM ≠ 0 at commit).
   `ledger` is the book of record for wallet rows; `balance` is a trigger-maintained
   cache and always equals `SUM(ledger.amount for that wallet)` — proven by
   `vw_wallet_reconcile` (drift must stay 0).
2. **Posting recipe** (`SELECT` it in 0017 file comments): hold debits the giver's
   allowance at submit; approve credits each recipient's `points_wallet`;
   decline/cancel refunds **exactly once** (refund journals MUST carry
   `reverses → the hold journal` and repay the hold's original destination — never
   "current period").
3. **Approval routing via rules only** (no settings magic): lowest-priority
   matching active rule for the kind, `condition jsonb` gate optional, catch-all
   guaranteed by seed. `rule_id` + `rule_version` freeze on the item.
4. **`recognition_pending` is a projection** — trigger-maintained from
   `recognition_history.status`; app code must never write it.
5. **COI back-stop trigger**: a conflicted approver (submitter, or a point-bearing
   recipient) can only be skipped/escalated — even if application code is wrong.
6. **Idempotency everywhere**: `recognition_history.idempotency_key`,
   `approval_item` same, `source_ref` for system rows, notification `dedupe_key`,
   outbox `dedupe_key`.
7. **Structured errors**: `insufficient_points`, `no_approval_route`,
   `allocation_below_spent`, `person_inactive`, `guest_cannot_receive`,
   `double_refund_blocked`, `decline_note_required`, `prize_pool_empty`.
8. **Auditability**: `audit_log` covers money, approvals, budget/policy,
   deactivation; `before/after` payloads are PII-scrubbed (emails → ids).

## 4) Function surface for the API layer

| Function | Purpose |
|---|---|
| `fn_submit_recognition(from, to[], cc[], value, tpl, msg, pts, art, kind, idemkey)` | validated submit: eligibility, self/COI blocks, hold journal, routing, step freezing; ≤100 auto-approves in-transaction |
| `fn_item_decide(item, decider, approve, note)` | lowest-pending-seq decide (ANY/ALL modes honored, FOR UPDATE locked); delegate on last step closes the item and releases/refunds |
| `fn_approve_recognition(item, decider)` / `fn_decline_recognition(item, decider, note)` | the money release/refund primitives (note mandatory on decline) |
| `fn_allowance_seed(period)` | quarter rollover: seed every eligible employee from `budget_policy` |
| `fn_admin_set_budget(user, period, allocated, actor)` | admin quota change (RBAC + SoD + audit) |
| `fn_deactivate_person(user, actor, reason)` | leaver: refund holds, cancel items, skip their pending steps, audit |
| `fn_finalize_award(award, nomination, decider)` | jury finalize: SYS_PRIZE funding check, payout journal, winner stamp |
| `fn_relay_outbox()` | drain outbox events (deliver notifications) |

## 5) Reference API endpoints (`api.js`)

```
GET  /api/people                    directory (id, code, name, title, dept, manager)
GET  /api/persons/:id               person dashboard (wallets, allowance, received, pending steps)
POST /api/praise {fromId,toIds,ccIds,points,message,valueId,idempotencyKey}
GET  /api/approvals/:userId         someone's inbox: {pending, actionable, decided}
POST /api/approvals/:id/decide {deciderId, approve, note}
```
Run: `DATABASE_URL='...' API_PORT=3001 node api.js`

## 6) Verification (run after any change)

```bash
DATABASE_URL='...' .venv/bin/alembic upgrade head                  # schema current
docker exec -i applause-pg psql -U postgres -d applause < verify.sql   # 22/22 core
docker exec -i applause-pg psql -U postgres -d applause < verify2.sql  # 20/20 edges
DATABASE_URL='...' node test_race.js                                  # 2/2 concurrency
docker exec -i applause-pg psql -U postgres -d applause < demo-reset.sql  # back to clean demo data
```
(One-shot: `bash run-suites.sh` runs all three with fresh resets between them.)

## 7) Production notes (not yet applied — build for these)

- Roles: run as `app_rw`; `ledger`/`journal_line`/`audit_log` should be owned by
  `ledger_owner` and app UPDATE/DELETE revoked (POC does REVOKE, not ownership split).
- Never trust client `fromId/deciderId` — real auth must map JWT → `users.id`.
  Admin fns already require `role_assignment` rows.
- Vouchers/redemption are phase-2 (the `SYS_REDEEMED` account path is already named
  in the posting recipe).
- Real secret management: demo password here is dev-only.
