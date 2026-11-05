"""/recognitions idempotent retry — the reviewer's double-click contract.

Same Idempotency-Key on a second POST resolves to the ORIGINAL recognition:
- same recognition_id (the replay branch)
- no double spend: the giver's given-count moves +1 total, the recipient's
  received/balance move exactly once
- no key / a NEW key still creates a separate recognition (expected dupes
  only when the client repeats its key)
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
def test_retry_with_same_key_replays_original() -> None:
    seed_demo_if_missing()

    recipient_id = db_exec(
        "SELECT id FROM users WHERE employee_code='E-RH'")
    key = "11111111-2222-3333-4444-555555555555"

    with TestClient(create_app()) as client:
        # deterministic allowance for both actors
        assert db_exec("UPDATE to_recog_points SET balance = allocated") is not None
        first_key = key
        body = {"to_user_ids": [recipient_id], "points": 30,
                "message": "idempotency fixture — auto band"}

        r1 = client.post("/api/v1/recognitions", headers={
            "X-Demo-User": "E-PR", "Idempotency-Key": first_key,
        }, json=body)
        assert r1.status_code == 200, r1.text
        first = r1.json()

        def stats(code: str) -> dict:
            rr = client.get("/api/v1/me/stats", headers={"X-Demo-User": code})
            assert rr.status_code == 200
            return rr.json()

        between_giver = stats("E-PR")
        between_recipient = stats("E-RH")

        # retry: same key, same body
        r2 = client.post("/api/v1/recognitions", headers={
            "X-Demo-User": "E-PR", "Idempotency-Key": first_key,
        }, json=body)
        assert r2.status_code == 200, r2.text
        replay = r2.json()

        # the retry resolves to the ORIGINAL recognition
        assert replay["recognition_id"] == first["recognition_id"]
        assert replay["status"] == first["status"]

        after_giver = stats("E-PR")
        after_recipient = stats("E-RH")

        # exactly ONE spend between the before/after window
        assert after_giver["recognitions_given"] == between_giver["recognitions_given"]
        received_delta = (after_recipient["recognitions_received"]
                          - between_recipient["recognitions_received"])
        assert received_delta == 0
        balance_delta = (after_recipient["points_balance"]
                         - between_recipient["points_balance"])
        assert balance_delta == 0

        # retries WITHOUT a key still create separate recognitions (no key = no dedupe promise)
        r3 = client.post("/api/v1/recognitions", headers={"X-Demo-User": "E-PR"}, json=body)
        assert r3.status_code == 200
        assert r3.json()["recognition_id"] != first["recognition_id"]
