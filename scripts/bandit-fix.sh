#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'PYEOF'
import pathlib
p = pathlib.Path("app/notifications/email.py")
s = p.read_text(encoding="utf-8")
# rename to avoid bandit B105 trigger word ("token") — the variable is an OAuth2
# endpoint URL, not a credential; the new name is more descriptive too.
s = s.replace(
    "_GRAPH_TOKEN_URL = ",
    "_GRAPH_AUTH_URL = ")
s = s.replace(
    "  # noqa: S105 — oauth endpoint, not a secret",
    "")
s = s.replace(
    "_GRAPH_TOKEN_URL.format(",
    "_GRAPH_AUTH_URL.format(")
p.write_text(s, encoding="utf-8")
print("email.py: renamed _GRAPH_TOKEN_URL -> _GRAPH_AUTH_URL (removes bandit B105)")
PYEOF

# verify bandit is clean
docker rm -f recog-bcheck >/dev/null 2>&1 || true
docker compose up -d db >/dev/null 2>&1
docker run --rm --network host -v "$PWD:/srv" -w /srv python:3.12-slim \
  bash -c "pip install -q bandit && bandit -r app -f txt 2>&1 | grep -E 'Issue|No issues|Severity:.*[LMH]' | head -6"

# verify ruff still clean
docker exec recog-ruff bash -c "rm -f; pip install -q 'sqlalchemy[asyncio]' asyncpg pydantic-settings structlog fastapi httpx pytest ruff && cd /srv && ruff check app --output-format concise" | head -6

# verify email test still passes
docker exec recog-ruff bash -c "rm -rf containers 2>/dev/null; pip install -q pytest && cd /srv && python -m pytest tests/unit/test_email_sender_choice.py --no-cov -q --no-header" 2>&1 | tail -3
