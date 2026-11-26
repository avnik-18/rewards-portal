"""Domain-error HTTP mapping — the reviewer-critical contract.

fn_submit_recognition (0030: zero-point direct publish) business failures
come back as mapped HTTP semantics (404/409/422), never a 500.
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
def test_recognize_value_not_found_is_404() -> None:
    """an unknown value id -> 404 WITH the fn code as the body, not a 500."""
    seed_demo_if_missing()
    recipient_id = db_exec("SELECT id FROM users WHERE employee_code='E-RH'")
    bogus_value = "99999999-9999-9999-9999-999999999999"
    with TestClient(create_app()) as client:
        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": "E-PR"}, json={
            "to_user_ids": [recipient_id],
            "value_id": bogus_value,
            "message": "domain-mapping fixture — unknown value",
        })
        assert r.status_code == 404, r.text
        assert r.json()["detail"] == "value_not_found"


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_recognize_unknown_recipient_is_404_and_self_is_409() -> None:
    seed_demo_if_missing()
    giver_id = db_exec("SELECT id FROM users WHERE employee_code='E-PR'")
    ghost = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    with TestClient(create_app()) as client:
        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": "E-PR"}, json={
            "to_user_ids": [ghost],
            "message": "domain-mapping fixture — ghost recipient",
        })
        assert r.status_code == 404, r.text
        assert r.json()["detail"].startswith("recipient_not_found")

        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": "E-PR"}, json={
            "to_user_ids": [giver_id],
            "message": "domain-mapping fixture — self recognition",
        })
        assert r.status_code == 409, r.text
        assert r.json()["detail"] == "self_recognition_blocked"


def test_recognition_replay_missing_row_is_integrity_error() -> None:
    """Reviewer: recognition_replay must not invent a 'cancelled' status when
    the projection has no row — a missing row right after fn_submit means the
    DB wrote nothing (integrity fault) → hard error, surfaced as a 500."""
    import asyncio  # noqa: F401
    import uuid

    async def run() -> None:

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
