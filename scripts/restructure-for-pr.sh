#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

PLACEHOLDER=0a09362517525508660a992955732e3c0a74217d

echo "== confirm the placeholder state is still what org/develop points at =="
git fetch origin 2>&1 | tail -1
CUR=$(git rev-parse origin/develop)
echo "org/develop = $CUR"

echo "== 1) reset org develop + main back to the placeholder (lead's revert) =="
git push origin --force "$PLACEHOLDER:refs/heads/develop" "$PLACEHOLDER:refs/heads/main" 2>&1 | tail -3

echo "== 2) local develop reset to the placeholder =="
git switch develop
git reset --hard "$PLACEHOLDER"

echo "== 3) feature branch from placeholder + squash-merge the full backend =="
git switch -c feature/initial-backend "$PLACEHOLDER"
git merge --allow-unrelated-histories --squash personal/develop 2>&1 | tail -3 || true
# resolve the README/.gitignore collisions with our repo's versions
if ! git diff --quiet --diff-filter=U; then
  git checkout --theirs README.md 2>/dev/null || git checkout HEAD -- README.md || true
  git checkout --theirs .gitignore 2>/dev/null || git checkout HEAD -- .gitignore || true
  git add -A
fi
git commit -m "feat: initial backend - approved schema, recognition/approval API, quality gates

- PostgreSQL schema via 18 Alembic revisions (double-entry points ledger,
  approval chains L1/L2/L3 + quota wallets, awards/jury, outbox, audit)
- Recognition flow API: submit praise (auto-approve band / routed chain),
  decision endpoint (approve / return / decline), pending approval inbox
- Auth identity via dependency (X-Demo-User in dev; Entra JWT slot ready)
- Microsoft Graph email sender (points-only, no currency in scope)
- Gates: 7-check scripts/verify.sh, 44-check db-verify.sh, pytest unit+integration
- Playwright integration scaffold, pre-commit hooks, Docker compose
" 2>&1 | tail -2

echo "== 4) push the feature branch =="
git push -u origin feature/initial-backend 2>&1 | tail -2

echo "== 5) org state check =="
git ls-remote --heads origin | awk '{print $2}'
git log --oneline -2 feature/initial-backend
