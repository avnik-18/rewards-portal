"""/recognitions/count over the live DB — skipped unless DATABASE_URL points
at an alembic-applause schema with (optionally) the seed applied.

Environment: DATABASE_URL (default: the compose recog demo URL), overridable
before import — same helpers as test_identity_stats.py.

Contract under test (description in the API design conversation / the same
spec mirrored from the DB workstream):
1. shape: the entire body is {"total": <int>} — nothing else
2. the count is the ACTUAL approved-row count (WHERE status = 'approved';
   cross-checked against SQL, never an invented constant — pending /
   declined / returned / cancelled recognitions do not happen from the
   reader's point of view)
3. delta: one auto-band submission (auto-approved on landing) moves the
   total by exactly +1
4. identity gates: no header → 400; unknown demo user → 404 (the shared
   get_actor_id dependency, not count-specific)
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
def test_recognitions_count_flow() -> None:
    seed_demo_if_missing()

    with TestClient(create_app()) as client:
        # 1) shape: {"total": <int>} and nothing else (0 is legitimate — a
        # fresh org has recognitions to create, not pre-seeded ones)
        r = client.get("/api/v1/recognitions/count", headers={"X-Demo-User": "E-PR"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(body.keys()) == {"total"}
        assert isinstance(body["total"], int) and body["total"] >= 0

        # 2) the count is the real APPROVED-row count, not a constant — and
        # the check DISCRIMINATES: send one approved row to 'declined'
        # out-of-band (restore in finally) so the filtered and unfiltered
        # counts split; if the filter were missing, total would stay pinned
        # to the whole-table count and fail the != below.
        truth = int(db_exec(
            "SELECT count(*) FROM recognition_history WHERE status = 'approved'"))
        assert body["total"] == truth

        discriminating = db_exec(
            "SELECT id::text FROM recognition_history "
            "WHERE status = 'approved' LIMIT 1")
        if discriminating:
            try:
                db_exec("UPDATE recognition_history SET status = 'declined' "
                        "WHERE id = :probe", {"probe": discriminating})
                truth_after = int(db_exec(
                    "SELECT count(*) FROM recognition_history "
                    "WHERE status = 'approved'"))
                everything = int(db_exec(
                    "SELECT count(*) FROM recognition_history"))
                r = client.get("/api/v1/recognitions/count",
                               headers={"X-Demo-User": "E-PR"})
                assert r.status_code == 200, r.text
                moved = r.json()["total"]
                assert moved == truth_after, (
                    "endpoint must track the approved-only truth after a row "
                    "leaves the approved set")
                assert everything > truth_after, (
                    "probe failed to split approved vs whole-table counts — "
                    "this cross-check covers nothing")
            finally:
                # the probe row was picked with status='approved', so
                # restoring that exact status is identity, not a guess
                db_exec("UPDATE recognition_history SET status = 'approved' "
                        "WHERE id = :probe", {"probe": discriminating})

        # 3) delta: one zero-point peer-cheer submission (0030: Recognize is
        # a points-free send) moves the total by exactly +1
        giver, recipient = "E-PR", "E-BR"
        recipient_id = db_exec(f"SELECT id FROM users WHERE employee_code='{recipient}'")
        r = client.post("/api/v1/recognitions", headers={"X-Demo-User": giver}, json={
            "to_user_ids": [recipient_id],
            "message": "recognitions-count delta fixture — peer cheer"})
        assert r.status_code == 200, r.text
        r = client.get("/api/v1/recognitions/count", headers={"X-Demo-User": "E-PR"})
        assert r.json()["total"] == truth + 1

        # idempotent refresh: the second count read is unchanged
        r = client.get("/api/v1/recognitions/count", headers={"X-Demo-User": "E-BR"})
        assert r.status_code == 200
        assert r.json()["total"] == truth + 1

        # (parallel-submission concurrency proof lives in the real-HTTP smoke:
        # tests/integration/count-smoke.py — TestClient cannot multiplex)

        # 4) identity gates come from the shared dependency
        assert client.get("/api/v1/recognitions/count").status_code == 400
        assert client.get("/api/v1/recognitions/count",
                          headers={"X-Demo-User": "NOBODY-HERE"}).status_code == 404

        # 5) surface sanity: only GET exists; POST is 405, and the OpenAPI
        # contract publishes exactly one new path
        r = client.post("/api/v1/recognitions/count")
        assert r.status_code == 405
        schema = client.get("/openapi.json").json()
        assert "/api/v1/recognitions/count" in schema["paths"]
        assert "get" in schema["paths"]["/api/v1/recognitions/count"]
        assert "post" not in schema["paths"]["/api/v1/recognitions/count"]
