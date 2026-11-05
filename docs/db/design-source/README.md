# emids Rewards & Recognition — Database design workspace (historical)

This folder preserves the **design-time work** from which the canonical
Alembic revisions in `alembic/versions/` were converted once. It is reference
material only: nothing here is applied to a database automatically, and
nothing here is a second schema source. The live schema contract is
[`alembic/versions/README.md`](../../alembic/versions/README.md) plus the
revisions themselves.

**For the API team:** `alembic/versions/` is the contract. Schema invariants
and the money posting recipe are encoded in SQL triggers/functions, so the DB
itself enforces most rules — the API layer (FastAPI) should call the stored
functions, not hand-write money math.

---

## 1) Files (what actually ships in this folder)

| File | What |
|---|---|
| `design-plan-v6.md` | design decisions behind the schema |
| `demo-seed.sql` | demo org + allowances seed (the maintained copy used by the API dev flow is `seed/demo.sql` at the repo root) |
| `demo-reset.sql` | wipe workflow data, re-seed fresh allowances + accounts |
| `purge-demo.sql` | hard reset to migration-built structure (no workflow data) |
| `verify-core.sql` | core runtime suite (22 checks): hold→release→credit, refund-exactly-once, double-spend, idempotency, self/COI blocks, reconcile = 0 |
| `verify-edges.sql` | edge suites (25 checks): budget RBAC/SoD/clawback, leaver flow, rule conditions, notifications + outbox, media registry, all journals balanced |
| `inspect-state.sql`, `inspect-sanity.sql` | inspection helpers |
| `requirements.txt` | this workspace's own tooling requirements |

## 2) The invariants (what the DB guarantees you)

1. **Double-entry, append-only money**: every money event is a `journal_entry`
   + balanced `journal_line`s (deferred trigger rejects SUM ≠ 0 at commit).
   `ledger` is the book of record for wallet rows; `balance` is a trigger-maintained
   cache and always equals `SUM(ledger.amount for that wallet)` — proven by
   `vw_wallet_reconcile` (drift must stay 0).
2. **Posting recipe** (SELECT it in 0017 file comments): hold debits the giver's
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

## 3) Function surface for the API layer

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

## 4) Backend verification flow

```bash
# canonical build + demo data (from the repo root)
DATABASE_URL='postgresql+psycopg2://postgres:applause_dev@127.0.0.1:5433/recog' alembic upgrade head
docker exec -i applause-pg psql -U postgres -d recog -f /tmp/demo.sql        # seed/demo.sql, docker cp'd in

# the two invariant suites
docker exec -i applause-pg psql -U postgres -d recog < docs/db/design-source/verify-core.sql
docker exec -i applause-pg psql -U postgres -d recog < docs/db/design-source/verify-edges.sql
```

Both suites read the schema as built by `alembic/versions/` and print their
pass/fail rows in `verify_results` / `verify2`.

## 5) Production notes (from the design phase — not yet applied, build for these)

- Roles: run as `app_rw`; `ledger`/`journal_line`/`audit_log` should be owned by
  `ledger_owner` and app UPDATE/DELETE revoked (POC does REVOKE, not ownership split).
- Never trust client `fromId/deciderId` — real auth must map JWT → `users.id`.
  Admin fns already require `role_assignment` rows.
- Vouchers/redemption are phase-2 (the `SYS_REDEEMED` account path is already named
  in the posting recipe).
- Real secret management: the demo password used here is dev-only.
