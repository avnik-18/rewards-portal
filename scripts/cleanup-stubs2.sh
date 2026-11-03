#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

def patch(fname: str, old: str, new: str) -> None:
    p = pathlib.Path(fname)
    s = p.read_text(encoding="utf-8")
    if old in s:
        p.write_text(s.replace(old, new), encoding="utf-8")
        print(f"patched {fname}")

patch("app/models/schema.py",
      "fn_item_decide, fn_admin_set_budget, fn_finalize_award — see db/README.md).",
      "fn_item_decide, fn_admin_set_budget, fn_finalize_award — see\n"
      "docs/db/design-source/README.md).")
patch("app/repositories/applause_repository.py",
      "Function surface used here (see db/README.md §4):",
      "Function surface used here (see docs/db/design-source/README.md §4):")
EOF

find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

echo "== check remaining stale references across app/ =="
grep -rn "db/README.md" app || echo "clean"

echo
echo "== delete stale stub imports (services __init__ untouched) =="
grep -rn "approval_service\|wallet_service\|reports_service" app tests || echo "no live references to deleted stubs"
