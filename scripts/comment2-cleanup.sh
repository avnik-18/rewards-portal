#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
git switch feature/initial-backend >/dev/null 2>&1 || true

echo "== 1. remove every scratch/operator script from the branch =="
for f in add-pr-template.sh audit-migrations.sh audit-pr-scripts.sh commit-branch.sh \
         diagnose-db.sh fix-cleanup.sh fix-pr-comments.sh fix-ruff.sh prep-stats.sh \
         preview.sh runner.sh seed-demo-dashboard.sh setup-dev.sh; do
  git rm -q -f "scripts/$f" 2>/dev/null || rm -f "scripts/$f"
done
rm -f scripts/grep-repos.sh scripts/pull-rebase.sh scripts/check-comments.sh
echo "scripts/ kept:"; git ls-files scripts/

echo "== 2. rename in code/config (via python, no shell-quoting risk) =="
python3 - <<'EOF'
import pathlib
pairs = {
    "pyproject.toml": [('name = "recog-api"', 'name = "rewards-portal-api"')],
    "app/core/config.py": [('app_name: str = "recog-api"', 'app_name: str = "rewards-portal-api"')],
    "scripts/verify.sh": [
        ('whole recog-api scaffold', 'whole rewards-portal-api scaffold'),
        ('== recog-api verification ==', '== rewards-portal-api verification =='),
    ],
    "alembic/versions/README.md": [('recog-api database', 'rewards-portal-api database')],
    "package.json": [
        ('"name": "recog-api-e2e"', '"name": "rewards-portal-api-e2e"'),
        ('Playwright integration tests for recog-api', 'Playwright integration tests for rewards-portal-api'),
    ],
    "CLAUDE.md": [(" (formerly `recog-api`).", ".")],
    "README.md": [(" (formerly `recog-api`).", ".")],
}
for fname, older in pairs.items():
    p = pathlib.Path(fname)
    s = p.read_text(encoding="utf-8")
    for old, new in older:
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
print("renames applied")
EOF

echo "== verify no stale name except known-allowlisted =="
remaining=$(git grep -n "recog-api" -- . | grep -vEc "recognition|recog-api-db-1" || true)
echo "stray recog-api refs: $remaining (want 0)"
