#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

echo "== 1. delete every scratch/operator script from the branch =="
for f in add-pr-template.sh audit-migrations.sh audit-pr-scripts.sh commit-branch.sh \
         diagnose-db.sh fix-cleanup.sh fix-pr-comments.sh fix-ruff.sh prep-stats.sh \
         preview.sh pull-rebase.sh runner.sh seed-demo-dashboard.sh setup-dev.sh; do
  git rm -q -f "scripts/$f" 2>/dev/null || rm -f "scripts/$f"
done
rm -f scripts/grep-repos.sh scripts/pull-rebase.sh   # untracked leftovers
echo "scripts/ now:"; git ls-files scripts/

echo "== 2. rename recog-api -> rewards-portal-api in code/config =="
python3 - <<'EOF'
import pathlib, re

replacements = {
    "pyproject.toml": [('name = "recog-api"', 'name = "rewards-portal-api"')],
    "app/__init__.py": [('recog-api —', 'rewards-portal-api —')],
    "app/core/config.py": [('app_name: str = "recog-api"', 'app_name: str = "rewards-portal-api"')],
    "package.json": [
        ('"name": "recog-api-e2e"', '"name": "rewards-portal-api-e2e"'),
        ('Playwright integration tests for recog-api', 'Playwright integration tests for rewards-portal-api'),
    ],
    "scripts/verify.sh": [
        ('whole recog-api scaffold', 'whole rewards-portal-api scaffold'),
        ('== recog-api verification ==', '== rewards-portal-api verification =='),
    ],
    "alembic/versions/README.md": [('recog-api database', 'rewards-portal-api database')],
    "CLAUDE.md": [("(formerly `recog-api`).", ").")],
    "README.md": [("(formerly `recog-api`).", ").")],
}
for fname, pairs in replacements.items():
    p = pathlib.Path(fname)
    s = p.read_text(encoding="utf-8")
    for old, new in pairs:
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")
print("replacements applied")
EOF

echo "== 3. stable container compose name =="
python3 - <<'EOF'
import pathlib
p = pathlib.Path("docker-compose.yml")
s = p.read_text(encoding="utf-8")
if not s.startswith("name:"):
    s = "name: rewards-portal-api\n\n" + s
s = s.replace("  db:\n    image: postgres:15-alpine",
              "  db:\n    container_name: recog-api-db-1\n    image: postgres:15-alpine")
s = s.replace("  api:\n    build: .",
              "  api:\n    container_name: recog-api-api\n    build: .")
p.write_text(s, encoding="utf-8")
print("compose stabilized")
EOF

echo "== 4. remaining occurrences (expect only schema names) =="
git grep -n "recog-api" -- . | grep -vE "recognition|recog-api-db-1$|container_name" || echo none
