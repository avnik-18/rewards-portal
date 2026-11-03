#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'PYEOF'
import pathlib

# 1. main.py: add the missing structlog logger
p = pathlib.Path("app/main.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    "import structlog"
    if "import structlog" in s
    else "from app.services.recognition_service import RecognitionDomainError",
    "from app.services.recognition_service import RecognitionDomainError\n\nimport structlog\n\nlog = structlog.get_logger(__name__)"
)
p.write_text(s, encoding="utf-8")
print("main.py logger added")

# 2. config.py: database_url empty default + start-up guard (fail-closed kept for mypy)
p = pathlib.Path("app/core/config.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    '    database_url: str  # REQUIRED — no default: fail-closed at start-up',
    '    database_url: str = ""  # REQUIRED — start-up guard raises if empty')
p.write_text(s, encoding="utf-8")

# 3. mypy plugin for pydantic
p = pathlib.Path("pyproject.toml")
s = p.read_text(encoding="utf-8")
s = s.replace(
    "[tool.mypy]\npython_version = \"3.12\"\nstrict = true",
    "[tool.mypy]\npython_version = \"3.12\"\nstrict = true\nplugins = [\"pydantic.mypy\"]")
p.write_text(s, encoding="utf-8")
print("pyproject: pydantic mypy plugin added")

# 4. security.py: guard the empty database_url in require_identity_configured
p = pathlib.Path("app/core/security.py")
s = p.read_text(encoding="utf-8")
old = "    settings = get_settings()\n    if settings.environment is None:"
new = '''    settings = get_settings()
    if not settings.database_url:
        raise IdentityConfigError(
            "DATABASE_URL is required — refusing to start without a database"
        )
    if settings.environment is None:'''
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("security.py: DATABASE_URL preflight added")
PYEOF
echo ok
