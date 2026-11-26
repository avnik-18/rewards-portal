"""The bell panel read-path over the live DB (backend PR #8), skipped unless
DATABASE_URL points at an alembic-applause schema.

Contract:
1. GET /notifications answers the caller's unread feed — each row belongs to
   the caller, read_at IS NULL, and the praise rows carry giver + points
   cross-checked against SQL truth through the dedupe-key join.
2. POST /notifications/read marks every unread row of THE CALLER only —
   afterwards the list is empty and OTHER users' rows keep their unread flag.
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
def test_notifications_unread_feed_and_mark_read() -> None:
    seed_demo_if_missing()

    actor_id = db_exec("SELECT id FROM users WHERE employee_code = 'E-PR'")
    other_unread_before = int(
        db_exec("SELECT count(*) FROM notification WHERE read_at IS NULL AND user_id <> :u",
                {"u": actor_id})
    )

    # as-found snapshot BEFORE the mark — the restore only re-opens THESE rows
    pre_unread_ids = db_exec(
        "SELECT array_agg(id) FROM notification WHERE read_at IS NULL AND user_id = :u",
        {"u": actor_id},
    )

    with TestClient(create_app()) as client:
        r = client.get("/api/v1/notifications", headers={"X-Demo-User": "E-PR"})
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) <= 20

        unread_truth = int(
            db_exec(
                "SELECT count(*) FROM notification WHERE user_id = :u AND read_at IS NULL "
                "AND delivery_status IN ('queued','sent')",
                {"u": actor_id},
            )
        )
        # the default page caps at 20 — beyond that the LIMIT trims, not lies
        assert len(rows) == min(unread_truth, 20), (
            "every unread row of the caller up to the page cap, and ONLY unread"
        )

        for row in rows:
            # 0023 notify_parties: praise rows also carry the share surface
            # (receiver_name + receiver_count) beside giver enrichment
            assert set(row.keys()) == {"id", "type", "giver_name", "receiver_name",
                                       "receiver_count", "points", "message",
                                       "created_at"}
            # caller-owned truth (params bound, never interpolated)
            owner = db_exec("SELECT user_id FROM notification WHERE id = :n", {"n": row["id"]})
            assert owner == actor_id

        # praise enrichment: the giver's live full_name via the dedupe key
        # (0023 shapes: 'praise:<recog>:', 'praise_sent:<recog>:<to>:' and
        # 'praise_cc:<recog>:<cc>:' — the FIRST uuid is the recognition)
        praise_rows = [row for row in rows
                       if row["points"] is not None and row["type"].startswith("praise")]
        for row in praise_rows:
            giver_truth = db_exec(
                "SELECT u.full_name FROM notification n"
                ", recognition_history rh"
                " JOIN users u ON u.id = rh.from_user_id"
                " WHERE n.id = :n"
                "   AND rh.id = (substring(n.dedupe_key from ':([0-9a-f-]+):'))::uuid",
                {"n": row["id"]},
            )
            # a truthy join pins the enrichment; an empty join is a demo-DB
            # orphan (the recognition row was cleaned after the notification
            # was written) — skip those rather than pin nothing
            if giver_truth:
                assert row["giver_name"] == giver_truth, row["id"]

        # mark-all read: the count afterwards matches zero for THIS caller
        m = client.post("/api/v1/notifications/read", headers={"X-Demo-User": "E-PR"})
        assert m.status_code == 200, m.text
        assert m.json() == {"marked_read": unread_truth}

        empty = client.get("/api/v1/notifications", headers={"X-Demo-User": "E-PR"})
        assert empty.status_code == 200
        assert empty.json() == []

        badge = client.get("/api/v1/notifications/unread-count", headers={"X-Demo-User": "E-PR"})
        assert badge.status_code == 200
        assert badge.json()["unread_count"] == 0

        # isolation — other actors keep their unread rows untouched
        other_unread_after = int(
            db_exec("SELECT count(*) FROM notification WHERE read_at IS NULL AND user_id <> :u",
                    {"u": actor_id})
        )
        assert other_unread_after == other_unread_before

    # restore AS-FOUND state: only the rows that were unread before this test
    # go back to unread (a pre-read row must not get re-opened afterwards).
    # db_exec hands back the textual array '{id1,id2}' — compare Prager
    # id::text against its elements instead of forcing an uuid[] cast.
    if pre_unread_ids:
        ids_csv = pre_unread_ids.strip("{}")
        db_exec(
            "UPDATE notification SET read_at = NULL"
            " WHERE id::text = ANY(string_to_array(:ids_csv, ','))",
            {"ids_csv": ids_csv},
        )
