#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# tests/unit/test_recognition_mapping.py: iterate _SQLSTATE_TO_CODE values so
# the SQLSTATE table and the router cannot drift apart (reviewer ask)
p = pathlib.Path("tests/unit/test_recognition_mapping.py")
s = p.read_text(encoding="utf-8")
marker = '''def test_unmapped_code_falls_to_500() -> None:'''
addition = '''def test_every_sqlstate_code_maps_to_http() -> None:
    """Every code raised in the fns (all of _SQLSTATE_TO_CODE's values) maps
    to an HTTP status above 400 — the router table can never drift into a
    silent 500 for a mapped business failure (reviewer ask)."""
    from app.services.recognition_service import _SQLSTATE_TO_CODE
    for code in _SQLSTATE_TO_CODE.values():
        assert _code_status(code) != status.HTTP_500_INTERNAL_SERVER_ERROR, code
        assert _code_status(code) in {
            status.HTTP_403_FORBIDDEN,
            status.HTTP_409_CONFLICT,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_404_NOT_FOUND,
        }, code


def test_unmapped_code_falls_to_500() -> None:'''
s = s.replace(marker, addition, 1)

# points_out_of_range / recipient_not_found / item_not_found / person_not_found:
# assert them explicitly against the exact statuses (422/404)
s = s.replace(
    '''def test_unmapped_code_falls_to_500() -> None:''',
    '''def test_review_flagged_codes_no_longer_500() -> None:
    assert _code_status("points_out_of_range") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("recipient_not_found") == status.HTTP_404_NOT_FOUND
    assert _code_status("item_not_found") == status.HTTP_404_NOT_FOUND
    assert _code_status("person_not_found") == status.HTTP_404_NOT_FOUND


def test_unmapped_code_falls_to_500() -> None:''')
p.write_text(s, encoding="utf-8")
print("mapping contract test extended")
EOF

docker rm -f recog-test-run >/dev/null 2>&1 || true
docker compose up -d db >/dev/null 2>&1
for i in {1..30}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done

cat > /tmp/Dockerfile.runner <<'EOF'
FROM python:3.12-slim
RUN apt-get update -qq && apt-get install -qq -y -q docker.io >/dev/null
RUN pip install -q 'sqlalchemy[asyncio]' alembic asyncpg psycopg2-binary pydantic-settings structlog fastapi 'uvicorn[standard]' opentelemetry-sdk opentelemetry-instrumentation-fastapi httpx pytest pytest-asyncio pytest-cov ruff mypy pylint pyjwt[crypto] cryptography
EOF
docker build -q -t recog-test-runner -f /tmp/Dockerfile.runner /tmp >/dev/null

docker run -d --name recog-test-run --network host -v "$PWD:/srv" -v /var/run/docker.sock:/var/run/docker.sock -w /srv \
  -e ENVIRONMENT=local \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  -e PG_CONTAINER=recog-api-db-1 \
  recog-test-runner sleep 900 >/dev/null

echo "== pytest (all) =="
docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -4"
echo "== naming =="
docker exec recog-test-run bash -c "cd /srv && pylint --disable=all --enable=invalid-name app 2>&1 | grep -E 'C0103|rated' | head -6"
echo "== ruff (app) =="
docker exec recog-test-run bash -c "cd /srv && ruff check app --output-format concise 2>&1 | wc -l"
echo "== mypy (app) =="
docker exec recog-test-run bash -c "cd /srv && mypy app 2>&1 | tail -4"
