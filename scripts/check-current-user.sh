#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== references to the old identity strings in app/tests =="
grep -rn "get_current_user\|CurrentUser\|X-Demo-User in body" app tests || echo none
echo "== app/schemas/auth.py used? =="
grep -rn "schemas.auth\|from app.schemas import auth" app tests || echo unused
echo "== _actor_id references =="
grep -rn "_actor_id\b" app tests | grep -v "actor.py" || echo none
