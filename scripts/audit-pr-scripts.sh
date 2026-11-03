#!/usr/bin/env bash
# Audit the branch for: hardcoded machine paths, force-push code, operator-only scripts.
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
git switch feature/initial-backend >/dev/null 2>&1 || true

echo "== scripts that exist in the PR =="
git ls-tree --name-only HEAD scripts/

echo
echo "== hardcoded personal paths anywhere =="
grep -rn "/mnt/c/Users/shouryac" --include="*" . --exclude-dir={.venv,.git,node_modules,__pycache__} | grep -v "^\./\.venv" || echo none

echo
echo "== force-push anywhere in committed code =="
grep -rn "force" --include="*.sh" --include="*.py" . --exclude-dir={.venv,.git,node_modules} | grep -vE "\.venv|force=|Force=|force_fields" || echo none
