#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
python3 - <<'EOF'
import pathlib
p = pathlib.Path("README.md")
s = p.read_text(encoding="utf-8")
s = s.replace("Dashboard read APIs (`/me`, `/me/stats`, leaderboard, awards showcase, media)\nin progress — see `CLAUDE.md` for the stub map.",
              "Dashboard read APIs in progress — see `docs/adr/0001-business-logic-in-pl-pgsql.md`\nfor the recorded architecture decision.")
s = s.replace("`db/README.md`", "`docs/db/design-source/README.md`")
p.write_text(s, encoding="utf-8")
print("README checked/updated")
EOF
grep -n "db/README.md\|stub map" README.md CLAUDE.md || echo "no stale refs"
