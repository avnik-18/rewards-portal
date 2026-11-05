"""/me and /me/stats over the live DB — skipped unless DATABASE_URL points at an
alembic-applause schema with (optionally) seed/demo.sql applied.

Environment (all overridable, compose defaults baked in):
  DATABASE_URL  the alembic-built DB (default: compose recog DB)
  PG_CONTAINER  the docker container serving that DB (default: recog-api-db-1)
  PG_DB         its database name (recog)

The actor identity is sent via the X-Demo-User header (dev fallback mode) —
the request is caller-scoped and the body NEVER carries it.

One flow, one client (per repo precedent — the app's async engine is created
once per process, so multi-client tests would trip closed event loops):
1. /me resolves the header actor: employee_code == header, full_name
   non-empty, role in the provisional set {individual, admin, hr}; a seeded
   admin resolves role 'admin' (RBAC groundwork)
2. guards: no header -> 400; unknown demo user -> 404
3. stats deltas: submitting one auto-band recognition moves given (+1 for
   the giver), received (+1) and balance (+points) for the recipient, and
   decays the giver's allowance left by the same points
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
    """Probe the ACTUAL configured DATABASE_URL (never a hardcoded fallback)."""
    try:
        from sqlalchemy import create_engine, text  # noqa: E402

        engine = create_engine(DATABASE_URL.replace("+asyncpg", "+psycopg2"))
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


DB_READY = _db_ready()


def db_exec(q: str) -> str:
    """Query via docker exec; container + db from env (PG_CONTAINER / PG_DB)."""
    try:
        return (
            subprocess.check_output(
                ["docker", "exec", CONTAINER, "psql", "-U", "postgres",
                 "-d", PG_DB, "-Atqc", q]
            ).decode().strip()
        )
    except Exception as e:
        # NOT silent: a failed probe means the environment is wrong — surface it.
        print(f"WARNING: _psql probe failed ({e!r}) — check "
              f"PG_CONTAINER={CONTAINER!r} / PG_DB={PG_DB!r}", file=sys.stderr)
        return ""


def seed_demo_if_missing() -> None:
    count = int(db_exec("SELECT count(*) FROM users WHERE employee_code LIKE 'E-%'") or 0)
    if count < 7:
        demo_seed = Path(__file__).resolve().parents[2] / "seed" / "demo.sql"
        db_exec_file(str(demo_seed))


def db_exec_file(local_sql: str) -> None:
    """Apply a local SQL file to the DB (docker cp + psql -f)."""
    name = Path(local_sql).name
    subprocess.check_call(["docker", "cp", local_sql, f"{CONTAINER}:/tmp/{name}"])
    subprocess.check_call(["docker", "exec", CONTAINER, "psql", "-U", "postgres",
                           "-d", PG_DB, "-f", f"/tmp/{name}"])


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_identity_and_stats_flow() -> None:
    seed_demo_if_missing()

    with TestClient(create_app()) as client:
        # 1) profile resolves the header actor
        r = client.get("/api/v1/me", headers={"X-Demo-User": "E-PR"})
        assert r.status_code == 200
        profile = r.json()
        assert profile["employee_code"] == "E-PR"
        assert profile["full_name"].strip() != ""
        assert profile["role"] in {"individual", "admin", "hr"}

        # 1b) RBAC groundwork: a seeded admin resolves role 'admin'
        admin_count = int(db_exec(
            "SELECT count(*) FROM role_assignment WHERE role='admin' AND revoked_at IS NULL") or 0)
        if admin_count > 0:
            admin_code = db_exec(
                "SELECT u.employee_code FROM role_assignment r JOIN users u ON u.id = r.user_id "
                "WHERE r.role='admin' AND r.revoked_at IS NULL LIMIT 1")
            r2 = client.get("/api/v1/me", headers={"X-Demo-User": admin_code})
            assert r2.status_code == 200
            assert r2.json()["role"] == "admin"
        else:
            pytest.skip("seed has no admin role rows yet")

        # 2) identity guards
        assert client.get("/api/v1/me").status_code == 400
        assert client.get("/api/v1/me/stats").status_code == 400
        assert client.get("/api/v1/me", headers={"X-Demo-User": "NOBODY-HERE"}).status_code == 404

        # 3) stats move with one auto-band recognition (delta assertions)
        giver, recipient = "E-PR", "E-BR"
        recipient_id = db_exec(f"SELECT id FROM users WHERE employee_code='{recipient}'")
        points = 25
        def stats(code: str) -> dict:
            r = client.get("/api/v1/me/stats", headers={"X-Demo-User": code})
            assert r.status_code == 200
            return r.json()

        before_giver = stats(giver)
        before_recipient = stats(recipient)

        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": giver}, json={
            "to_user_ids": [recipient_id], "points": points,
            "message": "identity-stats delta fixture — auto band"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved"

        after_giver = stats(giver)
        after_recipient = stats(recipient)

        assert after_giver["recognitions_given"] == before_giver["recognitions_given"] + 1
        if before_giver["allowance_left"] is not None:
            assert after_giver["allowance_left"] == before_giver["allowance_left"] - points
        received_delta = (after_recipient["recognitions_received"]
                          - before_recipient["recognitions_received"])
        assert received_delta == 1
        assert after_recipient["points_balance"] == before_recipient["points_balance"] + points
