#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# rename remaining _validate_entra_jwt call sites
p = pathlib.Path("tests/unit/test_identity_gate_and_jwt.py")
s = p.read_text(encoding="utf-8")
s = s.replace("sec._validate_entra_jwt", "sec.validate_entra_jwt")
p.write_text(s, encoding="utf-8")
print("test renamed")

# remove stale comment reference in schemas/recognition.py
p = pathlib.Path("app/schemas/recognition.py")
s = p.read_text(encoding="utf-8")
s = s.replace("(app.core.actor.get_actor_id), never from the body.",
              "(app.core.actor.get_actor_id), never from the body.")
p.write_text(s, encoding="utf-8")
EOF

find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
echo "== confirm no private references =="
grep -rn "_validate_entra_jwt\|_translating" app tests --exclude-dir=__pycache__ || echo clean
