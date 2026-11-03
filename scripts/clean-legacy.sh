#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
rm -f app/schemas/auth.py
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
python3 - <<'EOF'
import pathlib
p = pathlib.Path("app/schemas/recognition.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    "dependency (app/api/v1/recognitions.py::_actor_id), never from the body.",
    "dependency (app.core.actor.get_actor_id), never from the body.",
)
p.write_text(s, encoding="utf-8")
print("docstring fix applied")
EOF
echo "== confirm no live references =="
grep -rn "schemas.auth\|get_current_user\|CurrentUser" app tests || echo "clean — sole dependency: app.core.actor.get_actor_id"
