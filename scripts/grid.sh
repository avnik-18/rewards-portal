#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

# 1. bump line-length to a standard 120 (mapped_column FK strings are inherently long)
python3 - <<'PYEOF'
import pathlib

p = pathlib.Path("pyproject.toml")
s = p.read_text(encoding="utf-8")
s = s.replace("line-length = 100", "line-length = 120")
p.write_text(s, encoding="utf-8")
print("pyproject: line-length → 120")

# 2. S105 on _GRAPH_TOKEN_URL — the reviewer already said this is a false positive
p = pathlib.Path("app/notifications/email.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    '_GRAPH_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"',
    '_GRAPH_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"  # noqa: S105 — oauth endpoint, not a secret',
)
p.write_text(s, encoding="utf-8")
print("email.py: S105 noqa added")
PYEOF

# 3. ruff --fix: auto-fix I001 import-order + F401 unused imports
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-fixruff >/dev/null 2>&1 || true
cat > /tmp/DFruff <<'PYEOF'
FROM python:3.12-slim
RUN pip install -q ruff
PYEOF
docker build -q -t recogruff -f /tmp/DFruff /tmp >/dev/null
docker run --rm --network host -v "$PWD:/srv" -w /srv recogruff bash -c "cd /srv && ruff check --fix app tests 2>&1"
echo "== remaining =="
docker run --rm --network host -v "$PWD:/srv" -w /srv recogruff bash -c "cd /srv && ruff check app tests --output-format concise" | head -8
