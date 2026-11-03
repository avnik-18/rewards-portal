#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# 1. models/schema.py: typing import + every bare dict Mapped typed
p = pathlib.Path("app/models/schema.py")
s = p.read_text(encoding="utf-8")
if "from typing import" in s and "Any" not in s.split("\n")[15]:
    s = s.replace("from typing import Optional", "from typing import Any, Optional")
s = s.replace("Mapped[Optional[dict]]", "Mapped[Optional[dict[str, Any]]]")
p.write_text(s, encoding="utf-8")

# 2. my JWT test: need exp/iat/nbf claims (the app requires them), typed OK
p = pathlib.Path("tests/unit/test_identity_gate_and_jwt.py")
s = p.read_text(encoding="utf-8")
old = '''        {"sub": "portal-sub", "oid": oid, "aud": aud, "iss": iss},'''
new = '''        {"sub": "portal-sub", "oid": oid, "aud": aud, "iss": iss,
             "exp": 9999999999, "iat": 1_600_000_000, "nbf": 1_600_000_000},'''
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("fixes applied")
EOF

docker exec recog-test-run bash -c "cd /srv && ruff check --fix tests/unit/test_identity_gate_and_jwt.py >/dev/null 2>&1 || true; ruff check tests/unit/test_identity_gate_and_jwt.py app/models/schema.py --output-format concise | head -6"
