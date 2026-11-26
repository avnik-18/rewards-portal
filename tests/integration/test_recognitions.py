"""Recognitions API over the live DB — skipped unless DATABASE_URL points at an
alembic-applause schema with (optionally) seed/demo.sql applied.

Recognize is cheers-for-peers only (0030): a send is zero-point, approved at
insert and published to feed_post in the same transaction. The actor
identity is sent via the X-Demo-User header (dev fallback mode) — the
request body NEVER carries it. Shared DB helpers come from
tests/integration/db_helpers.py — direct SQLAlchemy sync connections to the
same DATABASE_URL, no Docker coupling (reviewer).
"""

import os
import sys  # noqa: F401
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import (  # noqa: E402
    DB_READY,
    seed_demo_if_missing,
)
from tests.integration.db_helpers import (
    db_exec as _db_exec,
)


def _feed_count(recognition_id: str) -> int:
    return int(_db_exec(
        "SELECT count(*) FROM feed_post WHERE entity_type='recognition' "
        f"AND entity_id='{recognition_id}'"
    ) or 0)


@pytest.mark.skipif(not DB_READY, reason="no live recog DB (set DATABASE_URL)")
def test_cheers_direct_publish() -> None:
    seed_demo_if_missing()
    ids = {c: _db_exec(f"SELECT id FROM users WHERE employee_code='{c}'")
           for c in ("E-PR", "E-RH")}
    recipient = ids["E-RH"]

    with TestClient(create_app()) as client:
        # 1) direct publish: approved in-transaction, no approval item,
        #    and the feed row is already there when the caller hears back
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [recipient],
                "message": "cheers: direct publish lands on the feed",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "approved"
        assert body["routed_to"] == 0 and body["approval_item_id"] is None
        rid = str(body["recognition_id"])
        assert _feed_count(rid) == 1, "direct publish must insert feed_post"

        # recipients get zero points — points live in the award lane only
        share = _db_exec(
            f"SELECT points FROM recognition_recipients WHERE recognition_id='{rid}' "
            "AND kind='to' LIMIT 1"
        )
        assert int(share) == 0
        # cleanup: keep the demo feed tidy
        _db_exec(f"DELETE FROM feed_post WHERE entity_id='{rid}'")
        _db_exec(f"DELETE FROM recognition_recipients WHERE recognition_id='{rid}'")
        _db_exec(f"DELETE FROM recognition_history WHERE id='{rid}'")

        # 2) points are not a thing anymore: any nonzero send is a 422 at the DTO
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={"to_user_ids": [recipient], "points": 40, "message": "t: no points"},
        )
        assert r.status_code == 422, r.text

        # 3) idempotent replay returns the original recognition, never a duplicate
        key = "11111111-1111-1111-1111-111111111111"
        payload = {"to_user_ids": [recipient], "message": "cheers: replay test"}
        r1 = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR", "Idempotency-Key": key},
            json=payload,
        )
        assert r1.status_code == 200, r1.text
        r2 = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR", "Idempotency-Key": key},
            json=payload,
        )
        assert r2.status_code == 200, r2.text
        assert r1.json()["recognition_id"] == r2.json()["recognition_id"]
        rid2 = str(r2.json()["recognition_id"])
        assert _feed_count(rid2) == 1, "replay must not double-post the feed"
        _db_exec(f"DELETE FROM feed_post WHERE entity_id='{rid2}'")
        _db_exec(f"DELETE FROM recognition_recipients WHERE recognition_id='{rid2}'")
        _db_exec(f"DELETE FROM recognition_history WHERE id='{rid2}'")
