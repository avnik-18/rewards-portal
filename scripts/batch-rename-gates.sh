#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# 1. security.py: make the JWT validator public (reviewer nit: private imported cross-module)
p = pathlib.Path("app/core/security.py")
s = p.read_text(encoding="utf-8")
s = s.replace("async def _validate_entra_jwt(", "async def validate_entra_jwt(")
s = s.replace("- the actor dependency maps the token's oid claim to users.external_id (users.id)",
              "- the actor dependency (app.core.actor.get_actor_id) maps the token's oid claim to\n  users.external_id — the canonical identity dependency is public")
p.write_text(s, encoding="utf-8")
print("security.py renamed validator public")

# 2. actor.py docs: reference the public name
p = pathlib.Path("app/core/actor.py")
s = p.read_text(encoding="utf-8")
s = s.replace("(app.core.security)", "(app.core.security.validate_entra_jwt)")
p.write_text(s, encoding="utf-8")

# 3. recognitions.py: drops duplicated when-clause; simplified handler ordering
p = pathlib.Path("app/api/v1/recognitions.py")
s = p.read_text(encoding="utf-8")
s = s.replace('''    log.warning("recognition.domain_error", code=exc.code,
                path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    if status.HTTP_500_INTERNAL_SERVER_ERROR == _code_status(exc.code):
        log.error("recognition.unmapped_domain_code", code=exc.code)
    status_code = _code_status(exc.code)
    return JSONResponse(status_code=status_code, content={"detail": exc.code})''',
'''    status_code = _code_status(exc.code)
    if status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
        log.error("recognition.unmapped_domain_code", code=exc.code,
                  path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    else:
        log.warning("recognition.domain_error", code=exc.code,
                    path=request.url.path, actor_id=str(actor_id) if actor_id else None)
    return JSONResponse(status_code=status_code, content={"detail": exc.code})''')
p.write_text(s, encoding="utf-8")

# 4. delete the dead _translating helper
p = pathlib.Path("app/services/recognition_service.py")
s = p.read_text(encoding="utf-8")
s = s.replace('''    async def _translating(self, awaitable: Any) -> Any:
        """Wraps a DB call: DBAPIError → RecognitionDomainError with the
        stable code + the pg primary message as the detail."""
        try:
            return await awaitable
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e

''', "")
s = s.replace("from typing import Any\n", "") if "Any" not in s.replace("from typing import Any\n", "") else s
p.write_text(s, encoding="utf-8")
print("route/service refinements applied")
EOF

echo "== remaining old names?) =="
grep -rn "_validate_entra_jwt\|_translating" app tests || echo clean
