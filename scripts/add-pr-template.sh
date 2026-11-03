#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
git switch feature/initial-backend >/dev/null 2>&1 || true

echo "== content sanity: file count and README head =="
echo "files: $(git ls-tree --name-only -r HEAD | wc -l)"
git show HEAD:README.md | head -4

mkdir -p .github
cat > .github/PULL_REQUEST_TEMPLATE.md <<'EOF'
## What does this PR do?
<!-- One or two sentences: the what, and the why if not obvious. -->

## Why is this needed?
<!-- Link the issue / ticket / review thread if there is one. -->

## What's in it?
<!-- Screens / endpoints / migrations list; keep it scannable. -->
-

## How was it verified?
- [ ] `bash scripts/verify.sh` green (7/7)
- [ ] `bash scripts/db-verify.sh` green (22 core + 20 edges + 2 races) — schema PRs only
- [ ] `pytest -q` green (unit + integration)
- [ ] Ran on a clean scratch DB, not just a dev-state DB

## Schema changed?
<!-- All schema changes MUST land as Alembic revisions. No hand-DDL. -->
- [ ] No / [ ] Yes — revision(s):

## Remotes / breaking changes
<!-- Anything the UI team, DB team or deploy pipeline must react to? -->

## Reviewer notes
<!-- What took judgment? Where should the reviewer look first? -->
EOF

git add .github/PULL_REQUEST_TEMPLATE.md
git commit -m "docs: add pull request template" 2>&1 | tail -1
git push origin feature/initial-backend 2>&1 | tail -2

echo "== final branch state =="
git log --oneline -3
