#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
git fetch origin 2>&1 | tail -1
SHA=$(git rev-parse origin/feature/initial-backend)
echo "branch head: $(git rev-parse --short $SHA)"
echo
echo "1) message-parsing gone? (str(e.orig).split gone from service)"
git show $SHA:app/services/recognition_service.py | grep -c 'split(":")' || echo "0 — parsing removed ✅"
echo "   sqlalchemy pinned?"
git show $SHA:pyproject.toml | grep -n 'sqlalchemy'
echo "   lockfile committed?"
git cat-file -e $SHA:uv.lock 2>/dev/null && echo "uv.lock present ✅" || echo "uv.lock MISSING ❌"
echo
echo "2) family codes mapped?"
git grep -n "item_already_" $SHA -- app/api/v1/recognitions.py || echo "❌ missing in handler"
grep "item_already" <(git show $SHA:app/api/v1/recognitions.py) | head -2 || true
echo "   approver_unresolvable_at_step?"
git show $SHA:app/api/v1/recognitions.py | grep -n "approver_unresolvable" | head -3
git show $SHA:tests/unit/test_recognition_mapping.py | grep -c "approver_unresolvable_at_step" || true
echo
echo "3) not_pending_for_decider -> 403?"
git show $SHA:app/api/v1/recognitions.py | grep -n "403" | head -3
git show $SHA:app/core/security/../services/recognition_service.py | grep -n "not_pending_for_decider" | head -2
git show $SHA:tests/unit/test_recognition_mapping.py | grep -c "403" || true
echo
echo "4) closing 500 branch?"
git show $SHA:app/api/v1/recognitions.py | grep -n "500" | head -2
git show $SHA:tests/unit/test_recognition_mapping.py | grep -n "500" | head -3
echo
echo "5) DB_ERRORS gone?"
git grep -n "DB_ERRORS" $SHA -- app || echo "none ✅"
echo
echo "6) USING ERRCODE migration committed?"
git grep -c "USING ERRCODE" $SHA -- alembic/versions/0019_fn_errcodes.py || echo "❌ missing"
echo
git grep -c "ValidationError" $SHA -- app/repositories/applause_repository.py app/services/recognition_service.py 2>/dev/null || echo "ValidationError: fully removed ✅"
