"""Recognitions API over the live DB — skipped unless DATABASE_URL points at an
alembic-applause schema with (optionally) seed/demo.sql applied.

The actor identity is sent via the X-Demo-User header (dev fallback mode) —
the request body NEVER carries it. Shared DB helpers come from
tests/integration/db_helpers.py — direct SQLAlchemy sync connections to the
same DATABASE_URL, no Docker coupling (reviewer).
"""

import os
from pathlib import Path

import sys  # noqa: F401
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import (  # noqa: E402
    db_exec_file as _db_exec_file,
    db_exec as _db_exec,
    seed_demo_if_missing,
    allowance_balance as _allowance_balance,
    wallet_balance as _wallet_balance,
    db_ready as DB_READY,
)


@pytest.mark.skipif(not DB_READY, reason="no live recog DB (set DATABASE_URL)")
def test_recognition_flow() -> None:
    seed_demo_if_missing()
    ids = {c: _db_exec(f"SELECT id FROM users WHERE employee_code='{c}'")
           for c in ("E-PR", "E-RH", "E-BR", "E-L1")}
    giver, recipient = ids["E-PR"], ids["E-RH"]

    with TestClient(create_app()) as client:
        # deterministic wallet state
        _db_exec("UPDATE to_recog_points SET balance = allocated")

        # 1) auto-approve band (≤100): credits the recipient by exactly 40
        pre = _wallet_balance(recipient)
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [recipient],
                "points": 40,
                "message": "t: auto band",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "approved" and body["approval_item_id"] is None
        post = _wallet_balance(recipient)
        assert post == pre + 40, f"auto-approve must credit +40 (got {pre} -> {post})"

        # 2) routed band (101–200): SAME-recipient increment of exactly 150
        _db_exec("UPDATE to_recog_points SET balance = allocated")
        pre = _wallet_balance(recipient)
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [recipient],
                "points": 150,
                "message": "t: routed band",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending_approval" and body["approval_item_id"]
        item = body["approval_item_id"]

        # 2b) the approve decision credits the recipient
        r = client.post(
            f"/api/v1/recognitions/approval/{item}/decide",
            headers={"X-Demo-User": "E-L1"},
            json={"approve": True},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved"
        post = _wallet_balance(recipient)
        assert post == pre + 150, f"routed credit must be pre+150 (got {pre} -> {post})"

        # 3) decline: no note -> 422; with note the item closes declined
        _db_exec("UPDATE to_recog_points SET balance = allocated")
        pre_allowance = _allowance_balance(giver)
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [recipient],
                "points": 120,
                "message": "t: decline test",
            },
        )
        assert r.status_code == 200, r.text
        item2 = r.json()["approval_item_id"]
        pre_after_spend = _allowance_balance(giver)
        assert pre_after_spend == pre_allowance - 120, "hold must debit the allowance"

        r = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers={"X-Demo-User": "E-L1"},
            json={"approve": False, "note": None},
        )
        assert r.status_code == 422, r.text

        r = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers={"X-Demo-User": "E-L1"},
            json={"approve": False, "note": "wrong fit"},
        )
        assert r.status_code == 200 and r.json()["status"] == "declined"
        assert _allowance_balance(giver) == pre_allowance, (
            "declined points must be refunded exactly once"
        )
