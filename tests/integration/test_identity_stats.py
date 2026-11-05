"""/me and /me/stats over the live DB — skipped unless DATABASE_URL points at an
alembic-applause schema with (optionally) seed/demo.sql applied.

Environment: DATABASE_URL (default: the compose recog demo URL), overridable
before import — shared connection helpers live in tests/integration/db_helpers.py.

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
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import (  # noqa: E402
    DB_READY,
    db_exec,
    seed_demo_if_missing,
)


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
