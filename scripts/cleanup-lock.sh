#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# 1. the dead DB_ERRORS dict (repository): reviewed as never-used — remove
p = pathlib.Path("app/repositories/applause_repository.py")
s = p.read_text(encoding="utf-8")
start = s.find("DB_ERRORS = {")
if start != -1:
    end = s.find("}", start) + 1
    s = s[:start] + s[end:].lstrip("\n\n")
    p.write_text(s, encoding="utf-8")
    print("DB_ERRORS removed")

# 2. drop the unused IdentityConfigError import in recognitions.py
p = pathlib.Path("app/api/v1/recognitions.py")
s = p.read_text(encoding="utf-8")
s = s.replace("from app.core.security import IdentityConfigError\n", "")
p.write_text(s, encoding="utf-8")
print("unused import removed")

# 3. sqlalchemy pin: keep a stable major version, generate the lockfile
p = pathlib.Path("pyproject.toml")
s = p.read_text(encoding="utf-8")
s = s.replace('"sqlalchemy[asyncio]>=2.0",', '"sqlalchemy[asyncio]>=2.0.36,<2.1",')
p.write_text(s, encoding="utf-8")
print("sqlalchemy pinned")
EOF

$HOME/.local/bin/uv lock 2>&1 | tail -2
$HOME/.local/bin/uv pip install -e ".[dev]" 2>&1 | tail -2
