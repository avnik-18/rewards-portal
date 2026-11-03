#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

# rename the module-level engine caches to UPPER (module singletons per PEP 8)
sed -i 's/\b_engine_loop_id\b/_ENGINE_LOOP_ID/g; s/\b_engine\b/_ENGINE/g; s/\b_session_factory\b/_SESSION_FACTORY/g' app/db/session.py

# remove the unused fixture variable (recipient uuid is the one the POST uses)
sed -i 's/^        giver_id = _psql(f"SELECT id FROM users WHERE employee_code=.\x27{giver}.\x27")$//' tests/integration/test_identity_stats.py

echo "== ruff after fixes (touched set) =="
docker exec recog-test-run bash -c "cd /srv && ruff check app/core/actor.py app/api/v1/me.py app/api/v1/recognitions.py app/repositories/me_repository.py app/services/me_service.py app/schemas/me.py tests/integration/test_identity_stats.py tests/unit/test_walking_skeleton.py --output-format concise" | head -6
echo "== naming gate after rename =="
docker exec recog-test-run bash -c "cd /srv && pylint --disable=all --enable=invalid-name app 2>&1 | tail -2"
