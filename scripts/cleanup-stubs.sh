#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

echo "== delete dead stubs =="
git rm -q -f app/services/approval_service.py app/services/wallet_service.py app/services/reports_service.py

echo "== fix every stale reference in app/ (docstrings -> db/README.md, stub map, service-layer wording) =="
python3 - <<'EOF'
import pathlib

replacements_log = []

def patch(fname: str, pairs: list[tuple[str, str]]) -> None:
    p = pathlib.Path(fname)
    s = p.read_text(encoding="utf-8")
    changed = False
    for old, new in pairs:
        if old in s:
            s = s.replace(old, new)
            changed = True
    if changed:
        p.write_text(s, encoding="utf-8")
        replacements_log.append(fname)

# repository docstrings: db/README.md -> docs/db/design-source/README.md
patch("app/repositories/applause_repository.py", [
    ("See db/README.md in this repo for the fn surface\nand db/schema.sql for the DDL.",
     "See docs/db/design-source/README.md for the fn surface\nand schema.sql for the DDL."),
    ("recognition_service._error_code). p_idempotency_key dedupes client\n        retries at the unique index; the fn does not resolve the conflict.\n        ",
     "recognition_service._error_code). p_idempotency_key dedupes client\n        retries at the unique index; the fn does not resolve the conflict."),
])
EOF

echo "remaining 'db/README.md' mentions in app/:"
grep -rn "db/README.md" app || echo "none"
