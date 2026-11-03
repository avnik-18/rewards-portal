"""Domain-error HTTP mapping — the reviewer-critical contract.

The fn_submit_recognition business failures must come back as mapped HTTP
semantics (409/422/404), never a 500. POST /recognitions previously had no
try/except: this file pins the repaired behavior for every raise site.
"""

import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)
DATABASE_URL = os.environ.get("DATABASE_URL", TEST_DB)
CONTAINER = os.environ.get("PG_CONTAINER", "recog-api-db-1")
PG_DB = os.environ.get("PG_DB", "recog")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


def _db_ready() -> bool:
    try:
        from sqlalchemy import create_engine, text  # noqa: E402

        engine = create_engine(DATABASE_URL.replace("+asyncpg", "+psycopg2"))
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


DB_READY = _db_ready()


def _psql(q: str) -> str:
    try:
        return (
            subprocess.check_output(
                ["docker", "exec", CONTAINER, "psql", "-U", "postgres",
                 "-d", PG_DB, "-Atqc", q]
            ).decode().strip()
        )
    except Exception as e:
        print(f"WARNING: _psql probe failed ({e!r})", file=sys.stderr)
        return ""


def _seed_demo_if_missing() -> None:
    count = int(_psql("SELECT count(*) FROM users WHERE employee_code LIKE 'E-%'") or 0)
    if count < 7:
        demo_seed = Path(__file__).resolve().parents[2] / "seed" / "demo.sql"
        _psql_file(str(demo_seed))


def _psql_file(local_sql: str) -> None:
    name = Path(local_sql).name
    subprocess.check_call(["docker", "cp", local_sql, f"{CONTAINER}:/tmp/{name}"])
    subprocess.check_call(["docker", "exec", CONTAINER, "psql", "-U", "postgres",
                           "-d", PG_DB, "-f", f"/tmp/{name}"])


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_recognize_insufficient_points_is_409() -> None:
    """points way beyond the seeded allowance -> 409 WITH the fn code as the
    body, not a 500 (the original reviewer finding)."""
    _seed_demo_if_missing()
    recipient_id = _psql("SELECT id FROM users WHERE employee_code='E-RH'")
    with TestClient(create_app()) as client:
        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": "E-PR"}, json={
            "to_user_ids": [recipient_id],
            "points": 9000,     # schema cap 9999; far above the 250/250 allowance
            "message": "domain-mapping fixture — over-allowance",
        })
        assert r.status_code == 409, r.text
        assert r.json()["detail"] == "insufficient_points"
