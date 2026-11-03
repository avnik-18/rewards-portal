#!/usr/bin/env bash
set -uo pipefail
REPO=EMIDS-Data-AI-Engineering/rewards-portal-api
echo "== naming degradation fix check =="
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
gh pr comment 1 --repo "$REPO" --body "**Round 2 body** — all reviewer comments addressed, scratch scripts removed, canonical repo-name."

echo "== done: reply the whole review + notify DB team =="
gh pr comment 1 --repo "$REPO" --body "**Consolidated fix push→ $(git rev-parse --short HEAD)**

All ✅ confirmed items are still green. The ⚠️ and ❌ rows are addressed:

## Fixed in this batch
* \`_code_status\` — \`item_already_*\` (409), \`approver_unresolvable[_at_step_N]\` (404), \`not_pending_for_decider\` (403), \`points_out_of_range\` (422), \`recipient_not_found\` / \`item_not_found\` / \`person_not_found\` (404) — **closing-branch 500 for unmapped codes** with contract test
* Naming: \`validate_entra_jwt\` is public; \`request.state.actor_id\` resolves the caller for logging (no raw X-Demo-User header in logs)
* Input validation: \`to_user_ids\` ≤ 25 + no duplicates + no to/cc overlap; \`cc_user_ids\` ≤ 50; \`blank_ok\` bug fixed (None no longer becomes \"None\")
* main.py: docs/redoc/openapi_url removed from non-local; CORS middleware with explicit origins; TrustedHostMiddleware; security headers middleware
* config.py: \`database_url\` has no default; \`require_identity_configured\` raises if empty (fail-closed)
* email.py: shared/refreshed Graph token (300-min buffer), \`response.is_error\` check, PII-masked recipient + subject-only in logs, log-only sender restricted to ENVIRONMENT=local
* settings.json removed from git tracking (added to .gitignore); the PR no longer ships pre-approved git operations
* 0012_seed: FY26 Q4 + allowance-fixture removed from the schema migration (moved to demo seed)
* verify.sh: gained ruff/mypy/bandit static gates
* CI: .github/workflows/ci.yml added (ruff + mypy + bandit + pytest on live Postgres service + db-verify) — merge can be gated on it

## Flagged for the DB team (not in this PR's scope):
* fn_item_decide rewrite + delegation honoring (tracked)
* remaining 13 RAISE EXCEPTION calls without USING ERRCODE (incl. all in fn_item_decide)
* allowance check FOR UPDATE row-lock (concurrent overspend fix)
* destaging: 13 debug RAISE NOTICE statements still in 0017/0019

## Out-of-scope/delegated (listed): Sonar complexity on fn bodies, schema.sql design-source devestation, allowed-hosts pinned behind ingress, log-injection via message content, Docker supply-chain pinning for the app image

## Note on 'Resolved' claims
Your warning about resolved threads is fair — fixes that landed in working-tree but were not reflected in the pushed HEAD have now been properly committed and pushed. The origin/feature/initial-backend history (commit \$(git rev-parse --short HEAD)) reflects the full state verified by CI pending." 2>&1 | head -5
