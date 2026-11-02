# Database Design Plan v6 — emids Recognition & Rewards Portal ("Applause")

## Context

Front-end-only today (mock arrays). v6 is the production PostgreSQL schema, redesigned
against BOTH prior review panels AND the third, stricter review (blockers B1–B3,
majors M1–M28). Postgres 15+, UUID PKs, `timestamptz`/`date`, snake_case.

**Scope ruling (user, 2026-10-29): vouchers are OUT of the core schema.** No
voucher_type/redemption/voucher/voucher_claim tables in core; the redemption posting
recipe still exists as a named account path (SYS_REDEEMED) so the phase-2 migration can
snap in without redesign.

## Locked decisions (updated)

| Decision | Choice |
|---|---|
| Engine | PostgreSQL; Render vs Supabase pinned before the money migration |
| Approval routing | **Rules only, single source of truth (B2).** `auto_approve_below` is not a setting — it is an `approval_rule` band with ZERO steps. Routing never consults settings |
| Money model | Double-entry. `journal_entry` + `journal_line` + `ledger` (book of record for wallet balances) + `ledger_account` incl. system accounts. SUM(lines)=0 per journal. Posting recipe fixed (§1 Money). Nightly reconcile |
| Allowance | Quarterly via `fiscal_period` FK (no is_active, no free dates). Sourced from versioned `budget_policy` (per role/level, proration), admin per-person override stays |
| Approval lifecycle | Acceptance criteria for returned/declined/cancel/quarter-close written into the state machine (§3B3) |
| Pending | **Master status is the single source of truth (M11):** the queue table is a TRIGGER-MAINTAINED PROJECTION of `recognition_history.status='pending_approval'` — app code can no longer desync it |
| Identity | `employment_status` is the sole active/inactive signal (is_active dropped per M20); `recognition_eligible NULL` stays the admin override; Entra GUID via `external_id` column (mapping later) |
| RBAC | Role model added (M21): `role_assignment` (admin, finance, hr, jury, ledger_owner) checked by all admin/system fns |
| Approvals guards | COI: approver ≠ submitter AND ≠ any recipient — skip or escalate, recorded (M9/M14). Self-recognition blocked in `fn_submit_recognition` (M14) |
| Adjustments | Mandatory reason, reversal link to the originating ledger row, SoD (no self-adjustment, finance-adjusts-finance needs second approver) (M18) |
| Notifications | Channel + delivery status + unique dedupe_key; events leave the transaction through an `outbox_event` (M28) |
| Awards | Single winner per category (ties phase-2); cycle FKs to `fiscal_period` (M27); endorsement lives ON THE APPROVAL ITEM only (M24) |

## Production house standards (every table)

- `created_at NOT NULL`; mutable tables get `updated_at` via shared touch trigger.
- Explicit `ON DELETE` everywhere; state transitions, no hard deletes.
- Every invariant stated in prose is a real constraint: UNIQUE/partial UNIQUE/CHECK
  (M3 explicitly: "unique per…", "≥0", "never 0", "≤ allocated", "unique while running"
  are ALL live constraints).
- "Exactly one" alternation constraints = `CHECK num_nonnulls(...) = 1` (M2) on
  approval_item links and ledger wallet/source columns.
- Append-only domains (`ledger`, `journal_line`, `audit_log`): REVOKE UPDATE/DELETE +
  immutability trigger owned by dedicated `ledger_owner` role.
- Balances trigger-maintained: `UPDATE <wallet> SET balance = balance + :d WHERE id=:id
  RETURNING balance`; `CHECK (>=0)`; no SERIALIZABLE retries.
- Idempotency keys on recognition/approval_item; + `source_ref` UNIQUE partial for
  system-generated recognitions (M17).
- node-pg-migrate migrations, mandatory down; CREATE INDEX CONCURRENTLY; staging from prod.

---

## 1) Table inventory (34 tables)

### Z1. Identity & org (4)

**users** (mock: People) —
`id uuid PK · employee_code text UNIQUE · email text UNIQUE (lower, CHECK)
· external_id text NULL (Entra GUID — migration later, never a key) ·
full_name · title · department text (normalized list later; audit covers changes) ·
avatar_url · joined_on date ·
employment_status enum(person_status: active|probation|onleave|paused|notice|separated)
— **the sole active/inactive signal (M20, is_active DROPPED)** ·
source enum(internal|guest) ·
recognition_eligible bool NULL (admin override; NULL = status='active') ·
recognition_eligible_effective_from date · created_at · updated_at`
- `eligible` = `COALESCE(recognition_eligible, employment_status='active')` — fn helper.
- idx(employment_status) · idx(manager_id) · idx(lower(email)).
- `manager_id FK->users SET NULL` — changes audited with effective date
  (`manager_effective_from date NOT NULL DEFAULT now()`, M19: history = audit rows; a
  full manager-history table is phase-2).

**teams** (entity; the 1-row fact set) —
`id uuid PK · name UNIQUE · code UNIQUE · project_name · description ·
created_at · updated_at` (is_active DROPPED — a closed team empties its members).

**team_members** —
`id uuid PK · team_id FK->teams CASCADE · user_id FK->users CASCADE ·
role enum(lead|member) · valid_from date NOT NULL · valid_to date NULL (M19 effective dating)
· UNIQUE(team_id, user_id, valid_from)` · idx(user_id).
Lead = the open (valid_to NULL) row with role='lead'.
fn_join_team / fn_leave_team maintain dating; **"whose team" for any budget/claim answers:
reporting line for approvals (`manager_id`), project team via open membership — both
explicit, HR-ruled (M6)**.

**role_assignment** (M21) —
`id uuid PK · user_id FK->users CASCADE · role enum(app_role: admin|finance|hr|jury_member|system)
· granted_by FK->users · granted_at · revoked_at NULL · note`
- partial UNIQUE(user_id, role) WHERE revoked_at IS NULL — roles are checked BY FN,
  not by app code claims. Jury rosters reference this (or per-cycle `jury_assignment`).

**entities** naming note: mock names map 1:1 (People→users, TEAM→teams+team_members).

### Z2. Money (8) — the double-entry core

**fiscal_period** (M4/M27) —
`id uuid PK · name text UNIQUE ("FY26 Q4") · starts date · ends date ·
CHECK (ends > starts) · UNIQUE(starts)` — every cycle/dated window FKs here.
Quarter close = moving current rows into the NEXT period + a close journal; no
free-form dates anywhere.

**budget_policy** (M5, versioned) —
`id uuid PK · version int · applies_to enum(role_band: all|manager|senior|fixed) ·
role_band_employee NULL FK->users (specific-person policy) ·
quarterly_allowance int CHECK (>0) · recipient_cap_per_period int NULL (M7) ·
carry_over bool DEFAULT false · effective_from date · effective_to date NULL ·
created_by FK` — CHECK (effective_to IS NULL OR effective_to > effective_from) ·
overlap-guard trigger per applies_to · RIGHT: **no two open rows per applies_to**.
Seed-time resolution fn (money verifier fix — the join path is defined):
fixed-person row (role_band_employee = user) > manager role (open lead row of a team
the user belongs to) defined as "manager", "senior" resolved by
employment grade later; otherwise the `all` row; proration = ratio of days joined in
period (joiners only; leavers forfeit remaining allowance).

**to_recog_points** (allowance wallet) —
`id uuid PK · user_id FK->users NOT NULL · period_id FK->fiscal_period NOT NULL ·
allocated int NOT NULL >0 (seeded from budget_policy; admin override
fn_admin_set_budget still supported) · balance int NOT NULL >=0 CHECK (balance<=allocated) ·
UNIQUE(user_id, period_id)` — no is_active (M4): the live row = the period
containing today; last period's rows are frozen at close.

**points_wallet** —
`id uuid PK · user_id FK->users UNIQUE · balance int NOT NULL DEFAULT 0 CHECK (>=0)`

**ledger_account** (B1 — named accounts) —
`id uuid PK · code text UNIQUE · kind enum(account_kind: user_wallet|system) ·
user_id FK->users NULL (when kind=user_wallet, mirrors their wallet row) ·
wallet FK->points_wallet NULL · allowance FK->to_recog_points NULL ·
CHECK kind user_wallet ⟺ (wallet OR allowance linked) ·
CHECK kind='system' ⟹ (wallet IS NULL AND allowance IS NULL AND user_id IS NULL)
(integrity verifier — the system arm is constrained too)` — system codes seeded:
`SYS_BUDGET_FUND` (allowance mint sink), `SYS_PENDING` (in-flight hold liability),
`SYS_PRIZE` (award prize pool), `SYS_MILESTONE_FUND`, `SYS_WELCOME_FUND`,
`SYS_GRANT_FUND`, `SYS_REDEEMED` (phase-2 redemption sink), `SYS_EXP` (expiry void).
System account balances are DERIVED = SUM(journal lines) — enforced at finalize.

**journal_entry** (B1) —
`id uuid PK · kind enum(journal_kind: allowance_seed|recognition_hold|recognition_release|
recognition_refund|payout|grant|earning|milestone|welcome|adjustment|reversal|expiry|deactiv_refund)
· memo · linked FK NULL (one of: recognition_id FK|award_id FK|user_id FK — num_nonnulls<=1) ·
reverses FK->journal_entry NULL — **CHECK kind='recognition_refund' ⇒ reverses IS NOT NULL
and target is a recognition_hold journal (the refund pays back the hold's DEBIT TARGET,
resolved from the hold's lines — NEVER "current period", which is what breaks the
post-quarter-close case); kinds adjustment|reversal|expiry also require reverses or an
explicit compensating target** (money-verifier MAJOR fix) ·
reason text NULL (NOT NULL for adjustment/reversal) ·
status enum(posted|void) · created_by FK->users NULL · created_at`
- posting recipe: a journal = one atomic money event; all its lines post in ONE transaction
  together with the wallet-row balance mutation.

**journal_line** (append-only) —
`id uuid PK · journal_id FK->journal_entry CASCADE · account_id FK->ledger_account ·
direction enum(debit|credit) · amount int NOT NULL CHECK (>0) · card "line" shape only —
the journal itself must balance: DEFERRED trigger validates SUM over the entry's lines
= 0 at commit (B1)`

**ledger** (book of record for WALLET rows specifically; every wallet-affecting line
also exists here so wallet balance is trivially checkable) —
`id uuid PK · journal_id FK->journal_entry (every row belongs to a journal) ·
to_recog_points_id FK NULL | points_wallet_id FK NULL — CHECK num_nonnulls(...)=1 ·
kind mirrors the journal kind · amount CHECK (<>0, signed from the wallet's perspective) ·
label (hold rows = generic label — privacy rule) · user_id FK · created_by · created_at`
- idx(wallet, created_at) · idx(user_id, created_at).
- **Posting recipe (B1, pinned):**
  | Event | Journal | Debit | Credit |
  |---|---|---|---|
  | Seed quarter | allowance_seed | SYS_BUDGET_FUND n | user allowance wallet n |
  | Submit praise (hold) | recognition_hold | user allowance wallet n | SYS_PENDING n |
  | Approve | recognition_release | SYS_PENDING n | recipient points_wallet n (one line per recipient) |
  | Decline / cancel / quarter-close refund | recognition_refund | SYS_PENDING n | user allowance wallet n |
  | Award payout | payout | SYS_PRIZE n | winner points_wallet n |
  | Grant / earning / milestone / welcome | grant|earning|… | SYS_*_FUND n | user points_wallet n |
  | Admin adjustment | adjustment | (either way) | — with reason + reverses link |
  | Redemption (phase-2) | — | user points_wallet n | SYS_REDEEMED n |
- Approve/decline contract: the hold set only SYS_PENDING move (giver does NOT get a
  second debit — because it debited at submit); refunds happen once, enforced by:
  a journal per event keying (UNIQUE(reverses_id)) + item state machine allowed
  transitions + fn guards (B3: no giver-debit-twice).
- **Journal link matrix** (integrity verifier — pin the "one of" on `journal_entry`):
  allowance_seed / adjustment / expiry / deactiv_refund journals MAY have zero linked
  columns; recognition-family journals (hold/release/refund) MUST link their
  recognition; payout MUST link its award. One CASE-CHECK + fn validation.
- **Sign conventions (money verifier)**: wallet delta == ledger.amount; a journal LINE's
  debit = −amount, credit = +amount against account balance; SYS account balance
  := SUM(credits) − SUM(debits). One convention, three encoders.
- **Release deadlock guard**: the approve release updates the N recipient wallet rows in
  ONE statement with ORDER BY id — no ABBA deadlocks between parallel approvals.
- **Nightly reconcile (B1)**: ① per wallet: balance = SUM(ledger.amount of that wallet)
  ② per journal (status='posted'): SUM(debits) = SUM(credits) — **void journals are
  excluded, and a void must be replaced by a compensating posted journal** ③ per SYS
  account: SUM(credit)−SUM(debit) = expected (SYS_PENDING ≈ total open holds; SYS_PRIZE
  non-negative before any payout). Drift = 0 alerts. Recipe rows for `expiry` and
  `deactiv_refund` are part of the recipe table (expiry: D wallet → C SYS_EXP;
  deactiv_refund: D SYS_PENDING → C allowance/points wallet).

### Z3. Recognition (5)

**recognition_history** — master row (pending state source of truth, M11).
`id uuid PK · kind enum(praise|milestone|welcome|award) · from_user_id FK->users NULL ·
value_id FK->emids_values NULL · template_id FK->recognition_templates NULL ·
award_id FK->awards NULL (kind='award' ⟺ award_id NOT NULL, M15) ·
message CHECK (<=2000) · base_points int CHECK (>=0) · art_url NULL ·
status enum(pending_approval|approved|declined|returned|cancelled) ·
occurred_at timestamptz · idempotency_key uuid UNIQUE NULL ·
source_ref text NULL (system recognitions: "milestone:3y:user_id",
"welcome:email"; partial UNIQUE(kind, source_ref) WHERE source_ref IS NOT NULL, M17) ·
created_at · updated_at`
- idx(status, occurred_at) WHERE pending_approval · idx(from_user_id, occurred_at DESC).
- **Locked while pending** (no edits to points/recipients/art; return→edit→resubmit).
- Audit: create + every status transition.
- fn_submit_recognition hard-blocks from_user_id = any recipient (M14: no self-praise)
  and non-eligible givers.

**recognition_recipients** (M13 — composite PK, resolved points, cc constraint) —
`recognition_id FK CASCADE · user_id FK->users · points int NOT NULL (resolved at
submit from COALESCE(points_override, base) by fn) · kind enum(to|cc) ·
PK (recognition_id, user_id)` — kind is a QUALIFIER not an extra PK leg;
**ONE merged CHECK (integrity verifier MAJOR fix): CHECK ((kind='to' AND points > 0)
OR (kind='cc' AND points = 0))** ·
SIGN convention: base_points on the recognition = the TOTAL over all 'to' recipients;
fn_submit enforces SUM(recipients.points WHERE to) = base_points, and the hold journal
debits exactly base_points (money verifier: single total, not per-recipient holds) ·
**Guest recipients (integrity verifier): a guest (source='guest') may be kind='cc'
ONLY (points=0 anyway); a guest on kind='to' is rejected by fn (`guest_cannot_receive`)**.
idx(user_id, kind).

**recognition_pending** (M11 — projection, not state) —
`id uuid PK · recognition_id FK->recognition_history UNIQUE · pending_since timestamptz`
- **Trigger-maintained**: trg on recognition_history — INSERT when status becomes
  pending_approval; DELETE when it changes to anything else. App code writes nothing
  here. Two fns/pages_benefit: inbox badge + audit-friendly "what is in flight".
- Single source = master status; the projection cannot desync.

**recognition_templates** —
`id uuid PK · value_id FK->emids_values CASCADE · name · emoji · art_json jsonb ·
prefill text NULL · is_active · UNIQUE(value_id, name)`.

**emids_values** — `id uuid PK · key UNIQUE · label · meta jsonb · is_active`.

### Z4. Policy & admin config (3)

**admin_setting_key** (M16 make values typed) —
`key text PK · label · data_type enum(bool|int|text) · allowed_range jsonb NULL ·
is_program_policy bool` — registry of every setting; a trigger validates each
admin_setting.value against the registry (bool/int/get type-checked).

**admin_setting** —
`key FK->admin_setting_key · value jsonb · value_text? no — updated_by FK · updated_at ·
PK (key)` — notification toggles, recipient_cap knobs, velocity knobs, slack keys.
Anything with a threshold-family meaning (allowance defaults etc.) LIVES IN
budget_policy instead, not here.
Registered keys include `points_expiry_months` (int ≥1 — the Rules panel knob lives
here; the expiry machinery itself is phase-2), `reciprocity_window_days`, and
`giver_daily_points_cap` — the submit-flow abuse checks read these.

**milestone_rule** (kept — the admin console edits these live) —
`id uuid PK · trigger enum(anniversary|birthday) · years int NOT NULL DEFAULT 0 ·
points int CHECK (>0) · posts_to_feed bool · awards_banner bool · is_active ·
UNIQUE(trigger, years)` — generation fn mints ledger `milestone` journals
funded by SYS_MILESTONE_FUND and recognition kind=milestone (idempotent via source_ref).

### Z5. Approvals (5) — routing, instances, lifecycle

**approval_rule** (M8, versioned, B2 single source) —
`id uuid PK · kind enum(points_recognition|award_endorsement) · version int NOT NULL DEFAULT 1 ·
condition jsonb NULL (extra predicates evaluated at submit: kind, value, cross_team,
recipient_count, min/max points repeated for readability) ·
min_points/max_points int (band) · priority int ·
UNIQUE (kind, priority) · is_active · created_by · version_note`
- **Routing semantics (approvals verifier MAJOR fix)**: fn_create_approval matches = the
  ACTIVE rule of the kind with the LOWEST priority number whose band contains the value
  AND whose condition passes; if none matches it raises `no_approval_route` BEFORE
  creating item/journal/hold (nothing is half-written). Seed invariant: exactly ONE
  catch-all rule per kind exists and stays active (band min/max NULL matches everything)
  — verified at 0014 and re-checked by the nightly reconcile.
- **Condition grammar**: `condition jsonb` is validated by a write-trigger against a
  fixed predicate shape ({"attr": kind|value_id|cross_team|recipient_count,
  "op": eq|in|gt|lt, "value": ...}), so a badly-shaped rule can't break submit-time
  routing.

**approval_rule_step** (chain template) —
`id uuid PK · rule_id FK CASCADE · seq smallint · level enum(L1|L2|L3|FINANCE) ·
subject enum(approver_subject: submitter_manager|submitter_manager_manager|
recipient_manager|fixed_user) (B2: WHOSE manager, explicitly) ·
fixed_user_id FK->users NULL · mode enum(ANY|ALL) (N approvers per step supported, B2)
· sla_hours int NULL (M10) · escalation_target enum(fp_manager|fixed_sys_admin) NULL
· CHECK fixed_user_id ⟺ subject='fixed_user' · UNIQUE(rule_id, seq)`.
A zero-step rule row IS the old "auto_approve_below" band — routing still goes through
the rule book, never the settings.

**approval_item** (the envelope; revision-aware M12) —
`id uuid PK · kind approval_kind · submitter_id FK · version int DEFAULT 1 ·
resubmitted_from FK->approval_item NULL (prior returned item) ·
rule_id FK->approval_rule · rule_version int (frozen at submit — B2 ambiguity killer) ·
recognition_id FK NULL | nomination_id FK NULL — num_nonnulls(...)=1 per kind (M2, as CHECK)
· snapshot jsonb AUTHORITATIVE (+ policy verdict + all flags) ·
status enum(pending|approved|returned|declined|cancelled) ·
decided_by FK->users NULL · decided_at NULL ·
CHECK (terminal-status ⟺ decided_by & decided_at present, M2) ·
idempotency_key uuid UNIQUE NULL · created_at · updated_at`
- **partial UNIQUE(resubmitted_from) WHERE resubmitted_from IS NOT NULL** (approvals
  verifier — one resubmission per returned item; the revision chain is 1:1).
- **Terminal states (approved|declined|cancelled) are final — no reopen**; fn_decide
  transition table forbids non-terminal→terminal? no: pending→terminal is the only
  exit; the item decided columns mirror nominations re-sync because of this.
- partial idx(status) WHERE pending · idx(submitter_id).

**approval_item_step** (frozen route + progress; multi-approver side M2) —
`id uuid PK · approval_item_id FK CASCADE · seq smallint · owner_id FK->users (a RESOLVED
approver) · mode enum(ANY|ALL) copied from the rule step · sla_due timestamptz NULL ·
status enum(pending|approved|declined|returned|skipped|escalated) ·
decided_by FK NULL · decided_at NULL · note text — NOT NULL when decided in
(declined, returned, skipped, escalated) (B3 mandatory reasons) ·
CHECK: status IN (pending, skipped, escalated) ⟺ decided_at IS NULL (approvals
verifier — symmetric decided-col constraint) ·
**BACKSTOP trigger (COI defense-in-depth, approvals verifier)**: BEFORE INSERT/UPDATE,
a step whose owner_id equals the item's submitter or any recipient of the linked
recognition can only have status IN (skipped, escalated) — so even a buggy fn cannot
let a conflicted approver DECIDE.
UNIQUE(approval_item_id, seq, owner_id)` (multi-approver rows share a seq)
- idx(owner_id, status) WHERE status='pending' = the inbox.
- Step resolution semantics (**closure rule**): a seq completes when —
  mode=ANY: one non-skipped owner approves; remainder rows auto-mark 'skipped'
  (audit) — or ALL: every owner approves. Any DECIDE at a seq closes the whole item
  immediately (declined/returned per B3 all-or-nothing with 1x refund protection).
- **Row locking** (approvals verifier): fn_decide_step / fn_cancel take
  `SELECT ... FOR UPDATE` on approval_item first — serializes decide-vs-cancel and
  ALL-step owner races; decide lock-reads the delegation row it resolves and re-checks
  `revoked_at IS NULL` just before commit (TOCTOU window closed in-commit; residual
  window audit-noted).
- **Inactive-owner sweeper** (0012): open steps owned by users with employment_status
  IN (paused, notice, separated) and no open delegation are skipped/escalated per the
  rule step's escalation_target — no item blocks on a departed owner.

**approval_delegation** (M10) —
`id uuid PK · delegator_id FK->users · delegate_id FK->users ·
valid_from timestamptz · valid_to timestamptz · scope enum(all|finance|award_endorsement) ·
granted_by · revoked_at · CHECK (valid_to > valid_from) · CHECK (delegate_id <> delegator_id)
(integrity verifier — the ≠ is now a constraint, not prose)` —
fn resolves a pending step's acting owner via OPEN delegation; the audit carries
"decided via delegation" chains. Delegator departure closes all their delegation rows.

**B3 — Lifecycle acceptance criteria (all encoded in fn_decide_step / fn_cancel /
posting recipe; each has a verification test):**
1. Returned: item → returned; queue projection empties; pending journal is REFUNDED
   (giver re-gains allowance); revision creates a NEW approval_item (version+1,
   resubmitted_from=old) with a FRESH snapshot; old item stays immutable.
2. Decline at L2 after L1 approval: seq-1 row remains decided (audit) and unchanged;
   item → declined; the refund journal fires exactly once (UNIQUE(reverses_id/same-key
   journal) makes a double refund impossible); submitter is notified; recipients get
   NOTHING (no ledger credit, no notification, no feed), and declined items
   never surface in any recipient-facing view.
3. Cancel while pending: submitter-or-admin only (fn permission check); same refund
   semantics as decline.
4. Returned-for-edit never touches an open approval; only the resubmit does.
5. Quarter close with in-flight pendings: the pending journal keeps pointing at the
   user's OLD period wallet (frozen row); approve after close releases to SYS_PENDING
   → recipient normally (SYS account is period-agnostic); new submissions target the
   new period automatically by fiscal_period FK resolution. No carry-over credit to
   the new period unless budget_policy.carry_over — via a `carry_over` journal.
6. Mandatory decline/return/skip/escalate reasons: note CHECK (column-level).
7. Notifications: submitter always notified of terminal states; recipients only of
   approved credit; and the queue projection + audit rows are consistent.

### Z6. Awards (4)

**awards** —
`id uuid PK · period_id FK->fiscal_period NOT NULL (M27, replaces cycle_label) ·
name (category) · description · value_id FK NULL · prize_points int >0 ·
max_nominations_per_nominator int · requires_jury bool ·
phase enum(draft|nominations|voting|result|closed|cancelled) (M25 gaps filled) ·
nominations_end date · voting_end date CHECK (voting_end >= nominations_end) ·
winner_nomination_id FK->awards_nominations UNIQUE NULL (single winner; ties phase-2) ·
winner_payout_points int >0 · decided_by FK NULL · decided_at NULL`
- UNIQUE(period_id, name) · completeness CHECK winner ⟺ decided.
- Audit: phase AND winner mutations.
- Journal for finalize: D SYS_PRIZE n → C winner points_wallet n (SYS_PRIZE must have
  balance — the finalize fn REFUSES with `prize_pool_empty`, M23 funding account).

**awards_nominations** (M24 — endorsement single-recorded, statuses filled) —
`id uuid PK · award_id FK->awards · nominee_id FK · nominator_id FK ·
story text · is_self_nomination bool · CHECK is_self = (nominator_id=nominee_id) ·
status enum(submitted|endorsed|under_review|returned|result|not_selected) (M25) ·
shortlisted bool NULL (jury screen's shortlist toggle — pre-vote state in one place) ·
flags jsonb '[]' — endorsed state lives ON the approval item; when the endorsement item
closes, fn stamps status='endorsed' (+ decided_by/decided_at mirrored columns kept FOR
READS, fn-stamped — a deliberate projection, not the record; terminal approval items
are never reopened, so the mirror cannot go stale) · created_at`
- UNIQUE(award_id, nominee) · idx(award_id, status) ·
  max_nominations enforced in fn_submit_nomination against awards.max_nominations_… (M26).

**jury_assignment** (M26 voter roster; complements role_assignment) —
`id uuid PK · award_id FK->awards · user_id FK->users · granted_by FK · granted_at ·
UNIQUE(award_id, user_id)` — fn_cast_vote requires an OPEN assignment (no role gamble).

**ballot** —
`id uuid PK · nomination_id FK CASCADE · juror_id FK->users ·
score smallint CHECK (1–5) · note · voted_at · UNIQUE(nomination_id, juror_id) (M26)`
- fn_finalize: AVG(ballots) for requires_jury categories → winner → payout journal.

### Z7. System (5)

**notification** —
`id uuid PK · user_id FK->users · type enum(praise_received|approval_pending|
approval_decided|award_updates|milestone|redemption|admin_announcement) ·
channel enum(in_app|email|slack) (M28) · payload jsonb (target person in payload = row
user_id, fn-enforced) · delivery_status enum(queued|sent|failed|read) ·
dedupe_key text UNIQUE NULL (M28 — idempotent fanout: recomputed notifications can't be
duplicated) · read_at NULL · created_at`
- partial idx(user_id, created_at) WHERE delivery_status IN (queued,sent).

**outbox_event** (M28, transactional-outbox) —
`id uuid PK · aggregate enum(recognition|approval|award|admin|ledger) · aggregate_id text ·
event_type text · payload jsonb · status enum(pending|sent|failed) · attempts int ·
next_attempt_at · sent_at NULL · dedupe_key text UNIQUE NULL · created_at · relayed_at`
- Written INSIDE the same transaction as the state change; a relay job drains it
  (notification fanout, Slack/Email adapters). idx(status, next_attempt_at).

**audit_log** (append-only, ledger_owner) —
`id bigserial PK · actor FK->users NULL · action · entity · entity_id ·
before jsonb · after jsonb (PII-scrubbed: emails→ids) · at timestamptz`
- Scope: ledger/journal inserts, approvals decisions & revisions, recognitions +
  transitions, allowance & budget_policy changes, manager/team membership changes,
  role_assignment changes, nominations/ballots/winners, approvals rules CRUD,
  settings changes, notification sends (via outbox relay), leaver actions.

**system_log** — as before: PK (at, id), monthly partitions, level/service/message/
user_id NULL/request_id/error_code/context (scrubbed)/hostname/deploy_sha.

**job_run** — as before: job_name partial-unique WHERE running, status enum incl.
timed_out, rows_affected, error, context.

---

## 2) Enum policy

All native enums: person_status, person_source, app_role, team_member_role,
recipient_kind, recognition_status, ledger/journal kinds (merged family),
account_kind, journal_kind, notification_channel + delivery status,
approval_kind, approval_level, approver_subject, step_mode, approval_status,
step_status (incl. skipped/escalated), deleg_scope, cycle_phase (with draft/closed/cancelled),
nomination_status (with returned/not_selected), result positions future,
log_level, job_status. ADDs later = safe ALTER ADD VALUE; renames forbidden.

## 3) Normalization & mock mapping (with reviewer rulings)

- toIds[] → recipients rows (points resolved at submit — no nullable credit).
- CC is a qualifier (kind='cc' ⟺ points=0) — hear-no-points is a rule, not a null.
- Team vs membership split: entity/1:N fact sets (teams vs team_members).
- Derived-only: leaderboards, dashboards, unread counts, eligible; balances cached
- The pending projection = trigger-maintained (M11 ruling).
- Rolling B decisions: auto-approve = zero-step rule; endorsement single-recorded (M24);
  multi-approver mode copies from rule (B2); budget per role (M5) replaces the single
  250 default in settings.

## 4) Read authorization matrix

Roles live in the role_assignment table (employee / manager-of X / approver / admin /
finance / hr / system), checked inside SECURITY DEFINER read fns.

| Table | Read rule |
|---|---|
| users | self; managers over own subtree; admin. Directory views expose id/full_name/title/dept/avatar only (no email) |
| teams/memberships | all active employees (org transparency) |
| to_recog_points | owner; admins via fn |
| points_wallet, ledger | owner's rows only; finance/admin full. Pending-hold rows: generic labels only on giver views (vw_ledger_person) |
| recognition_history | sender; to+cc recipients; that chain's approvers; admins (privacy) |
| recognition_pending / approval_item / item_step | pending: step owners + admins. snapshot: same. History: submitter + decided participants + admins |
| approval_rule(+step) | admin/finance/HR readable; employees hit the evaluated verdict only |
| awards/nominations/ballot | org-wide while phase-visible; ballots anonymous until result; jury_assignment visible to admins + those assigned users |
| budget_policy / admin_setting (+key) / milestone_rule | admin read; finance read |
| audit_log / system_log / job_run / outbox_event | admin & finance read-only (outbox for ops only) |

## 5) Security hardening

- **Segregation of duties** (kept): adjustments reject creator=owner; fn_admin_set_budget
  / fn_set_eligible reject self-target; finance adjusting finance requires a second
  approver parameter (M18 maker-checker arrives fully in phase 2 — reversal approvals).
- **COI (M9)**: fn_create_approval evaluates resolved step owners: if owner = submitter
  or = any recipient, mark step skipped (or escalate) with a note; if the entire chain
  collapses, escalate to the fixed sys_admin fallback. Enforcement remains fn-side.
- **Immutability**: ledger_owner owns ledger, journal_line and audit_log; the app
  role cannot rewrite history even with a compromise.
- **Abuse guardrails (M7)**: evaluated by fn_submit_recognition: per-recipient cap per
  period (budget_policy), reciprocity window (A→B within N days then B→A flagged, not
  blocked, recorded in the snapshot for the approver), velocity (giver points/day cap).
  All knobs are admin_setting rows; flag results are in the approval snapshot.
- **PII**: emails out of log mirrors; audit payloads scrubbed; directory view emailless.
- **Error contract**: insufficient_points, prize_pool_empty, allocation_below_spent,
  person_inactive, ineligible, journal_not_balanced — never silent clamping.
- **Idempotency**: recognition/approval_item keys; source_ref for system rows;
  outbox dedupe_key; journal reverses UNIQUE per target (double-refund guard).

## 6) Ops / platform (unchanged core)

Roles app_rw, app_ro, migration, ledger_owner; hardened SECURITY DEFINER fns
(`SET search_path`, REVOKE FROM PUBLIC); pgBouncer tx mode; timeouts; PITR +
quarterly restore rehearsal; monitoring incl. nightly reconcile drift = 0 (B1 ①②③).

## 7) Migration order

```
0001  extensions (pgcrypto, pg_partman)
0002  all enums
0003  users, teams, team_members, role_assignment (incl. external_id, effective dating)
0004  fiscal_period, budget_policy
0005  to_recog_points, points_wallet, ledger_account (seed system accounts), journal_entry
      (linked_recognition / linked_award created as BARE uuid columns here; their
      CONSTRAINTS are ALTER-added in 0008/0010 — integrity verifier MAJOR fix: no
      forward-referencing FKs can survive UP)
0006  journal_line + ledger (+ ledger_owner role, balance triggers, reconcile helpers)
0007  emids_values, recognition_templates, admin_setting_key, admin_setting, milestone_rule
0008  recognition_history, recognition_recipients, recognition_pending (projection trigger)
      + ALTER journal_entry ADD CONSTRAINT linked_recognition FK
0009  approval_rule, approval_rule_step, approval_item, approval_item_step, approval_delegation
      (+ fn_submit_recognition, fn_create_approval, fn_decide_step, fn_cancel — posting
      recipe baked in)
0010  awards, awards_nominations (nomination award_id FK inline; awards.
      winner_nomination_id added via ALTER afterwards — dissolves the awards cycle),
      journal_entry linked_award FK, jury_assignment, ballot, fn_submit_nomination,
      fn_finalize (prize journaling)
0011  notification, outbox_event (+ relay), fn_notify
0012  audit_log + trg_audit, system_log partitions, job_run, sweepers, nightly reconcile
0013  views (vw_directory, vw_ledger_person, vw_wallet_reconcile, vw_team_stats,
      vw_nomination_scores)
0014  seed (periods, policies, rules incl. the zero-step auto-approve band, values,
      templates, staff, system accounts balances)
0015  phase-2 (vouchers + SYS_REDEEMED wiring, external_identity, person badges,
      procurement/region pools, banner/ops, carry-over journals, multi-winner,
      maker-checker reversals, manager history table). **Reactions/comments are
      deliberately NOT modeled in any phase** (user decision) — the leftover feed UI
      is removed front-end-side, no tables.
```

## 8) Verification

1. Each migration UP+DOWN clean on scratch PG.
2. **Journal balance**: any submitted flow leaves every journal SUM(lines)=0; and
   per-wallet balance = SUM(ledger) + nightly reconcile all 0 (failure → alert).
   Refund-destination check: a refund after quarter close credits the OLD period's
   allowance row (resolved from the hold's lines), never the new one; void journal is
   excluded from reconcile and replaced by its compensating entry.
3. Double-spend attacks: decline → decline re-run fails (reverses-keyed refund +
   state machine); two parallel decides of one item serial on FOR UPDATE; parallel
   submissions with one idempotency key → exactly one row; resubmission of the same
   returned item twice → UNIQUE(resubmitted_from) blocks the second.
4. Routing determinism: 40-pt praise matches the zero-step rule and auto-approves;
   200-pt matches band 3; a gap band fixture raises no_approval_route with ZERO rows
   written; conflicting bands rejected by the priority UNIQUE; exactly one catch-all
   rule per kind active.
5. Lifecycle matrix from B3: all 7 acceptance criteria pass with receipts (audit rows,
   notifications, journal counts).
6. COI: submitter's manager = submitter → skipped/escalated, chain lands at sysadmin.
7. Budget versions: manager policy 400 vs base 250 resolves at seed; prorated joiner
   mid-period gets the prorated allowance; admin override still recorded + audited.
8. Eligibility: toggled-off user cannot give nor receive; NULL derives; guest cannot.
9. Abuse: cap-per-recipient exceeded → flagged (not silently dropped) in snapshot;
   reciprocity window produces the flag; velocity exceeded errors.
10. Awards: finalize honored by SYS_PRIZE balance; empty pool → prize_pool_empty error;
   ballots Unique(nom, juror) enforced; nomination caps enforced at submit.
11. Outbox: every state change emits its event exactly once (dedupe replay safe);
   relay idempotent; notification channels/delivery fates update.
12. RBAC: fn checks refuse role-forged calls; revoked role loses the capability within
    the same session txn.
13. Verification-round additions: SUM(recipients where to) = base_points = hold on every
    recognition; COI trigger fires even with a broken fn; inactive-owner sweeper
    escalates; delegation revoked mid-decide cannot commit an unauthorized decision
    without an audit note; guest recipients are cc-only; journal link matrix holds
    per kind (zero-link kinds exactly the four allowed).

## 9) Deferred to phase 2 (0015)

Vouchers + SYS_REDEEMED wiring redemption, external_identity Graph/Entra sync,
person badges, procurement wallet / regional pools / stock allocation, banner + ops
_record, carry-over journaling when policy.carry_over opens, multi-winner result sets,
maker-checker for reversals (finance-approval chain), manager/team full history table,
birthday columns behind legal signoff, reaction/comment vestige UI removal.

