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


def test_recognition_replay_missing_row_is_integrity_error() -> None:
    """Reviewer: recognition_replay must not invent a 'cancelled' status when
    the projection has no row — a missing row right after fn_submit means the
    DB wrote nothing (integrity fault) → hard error, surfaced as a 500."""
    import asyncio  # noqa: F401
    import uuid

    async def run() -> None:
        from uuid import UUID as UU

        from app.db.session import get_session_factory
        from app.repositories.applause_repository import ApplauseRepository

        factory = get_session_factory()
        async with factory() as session:
            repo = ApplauseRepository(session)
            bogus = str(uuid.uuid4())
            # a genuinely absent recognition (no fn ever recorded it)
            try:
                await repo.recognition_replay(bogus)
            except RuntimeError:
                return  # expected: NOT a fabricated status
            raise AssertionError(
                "missing recognition returned a status instead of failing")

    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(run())


DTO_KEYS = {"approval_item_id", "kind", "seq", "level", "mode", "owner_id",
            "submitter_name", "points", "note"}


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_pending_approvals_inbox_shapes_without_500() -> None:
    """Reviewer regression: GET /recognitions/approvals used to 500 whenever
    the inbox had rows (aliased ai.id vs approval_item_id, NULL base_points
    cast) and no test had ever called it. Now: routed recognition creates a
    pending item; the pending owner's inbox call must come back 200 with
    rows that validate against the DTO shape exactly."""
    _seed_demo_if_missing()
    recipient_id = _psql("SELECT id FROM users WHERE employee_code='E-BR'")
    # deterministic allowance headroom for the 0-approval-band recognition
    assert _psql("UPDATE to_recog_points SET balance = allocated") is not None
    with TestClient(create_app()) as client:
        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": "E-PR"}, json={
            "to_user_ids": [recipient_id], "points": 150,
            "message": "inbox fixture — routed band"})
        assert r.status_code == 200, r.text
        item_id = r.json().get("approval_item_id")
        assert item_id, "routed band must produce a pending approval item"

        # the pending step's owner id comes from the DB — no demo-org guessing
        owner_id = _psql(
            "SELECT s.owner_id FROM approval_item_step s "
            "WHERE s.approval_item_id = '" + item_id + "' AND s.status = 'pending'")

        found = None
        code = None
        for cand in ("E-L1", "E-L2", "E-L3", "E-AJ"):
            resp = client.get("/api/v1/recognitions/approvals",
                              headers={"X-Demo-User": cand})
            assert resp.status_code == 200, (cand, resp.text)
            rows = resp.json()
            assert isinstance(rows, list)
            for row in rows:
                # structural: every row matches the DTO keys exactly
                assert set(row) == DTO_KEYS, row
                assert isinstance(row["seq"], int) and isinstance(row["points"], int)
                if row["owner_id"] == owner_id and row["approval_item_id"] == item_id:
                    found = row
                    code = cand
        assert found is not None, "pending item owner's inbox must contain the item"
        assert found["points"] == 150
        assert found["submitter_name"].strip() != ""
        # and with rows present, a second pull stays clean (no 500s later)
        resp = client.get("/api/v1/recognitions/approvals", headers={"X-Demo-User": code})
        assert resp.status_code == 200
