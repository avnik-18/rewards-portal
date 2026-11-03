#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# repo: sort the import block
p = pathlib.Path("app/repositories/applause_repository.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    "from sqlalchemy.exc import DBAPIError\nfrom sqlalchemy import text",
    "from sqlalchemy import text\nfrom sqlalchemy.exc import DBAPIError",
)
p.write_text(s, encoding="utf-8")

# test: drop the unused fixture-borrowed var + split the long assert
p = pathlib.Path("tests/integration/test_recognition_idempotency.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    '''    giver_id = _psql(
        "SELECT id FROM users WHERE employee_code='E-PR'")''', "")
s = s.replace(
    '''        assert (after_recipient["points_balance"]
                == between_recipient["points_balance"])''',
    '''        balance_delta = (after_recipient["points_balance"]
                         - between_recipient["points_balance"])
        assert balance_delta == 0''')
s = s.replace(
    '''        assert after_recipient["recognitions_received"] == between_recipient["recognitions_received"]''',
    '''        received_delta = (after_recipient["recognitions_received"]
                          - between_recipient["recognitions_received"])
        assert received_delta == 0''')
p.write_text(s, encoding="utf-8")
print("polish applied")
EOF

docker exec recog-test-run bash -c "cd /srv && ruff check --fix app/repositories/applause_repository.py >/dev/null 2>&1 || true; ruff check app/repositories/applause_repository.py tests/integration/test_recognition_idempotency.py --output-format concise | head -6 && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -3"
docker rm -f recog-test-run >/dev/null 2>&1 || true
