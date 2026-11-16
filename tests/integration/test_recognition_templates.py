"""Recognition templates on the write path against a live alembic-built DB.

Covers sir's List A / A3 — POST /recognitions with template_id + art_url:
1. a valid (value, template) pair persists template_id and art_url columns
2. an unknown value_id            → 404 value_not_found       (C5497)
3. an unknown template_id         → 404 template_not_found    (C5498)
4. a template on a DIFFERENT value → 422 template_value_mismatch (C5499)
5. idempotent replay with the same Idempotency-Key — same id, no double row

Skipped unless DATABASE_URL points at a live DB (DB_READY gate), matching
the other integration tests' contract.
"""

import os
import uuid

import pytest

DATABASE_URL = os.environ.get("DATABASE_URL", "")
pytestmark = pytest.mark.skipif(
    "postgresql" not in DATABASE_URL,
    reason="needs a live alembic-built DB (DATABASE_URL)",
)

if DATABASE_URL:
    from tests.conftest import client
    from tests.integration.db_helpers import db_exec

    def _value_id(key: str) -> str:
        return db_exec(f"SELECT id FROM emids_values WHERE key='{key}'")

    def _template_for(value_key: str) -> str:
        return db_exec(
            "SELECT t.id FROM recognition_templates t JOIN emids_values e "
            f"ON e.id = t.value_id WHERE e.key='{value_key}' LIMIT 1"
        )

    def _recipient() -> str:
        return db_exec("SELECT id FROM users WHERE employee_code='E-PR'")

    def _actor_code() -> str:
        return "E-RH"

    def test_template_submission_persists_and_replays() -> None:
        body = {
            "to_user_ids": [_recipient()],
            "value_id": _value_id("customer_first"),
            "template_id": _template_for("customer_first"),
            "art_url": "https://cdn.emids.test/templates/customer-first-01.webp",
            "points": 10,
            "message": "kept customer demos on time — template path",
        }
        key = str(uuid.uuid4())
        first = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": _actor_code(), "Idempotency-Key": key},
            json=body,
        )
        assert first.status_code == 200, first.text
        rid = first.json()["recognition_id"]

        persisted_template = db_exec("SELECT template_id FROM recognition_history WHERE id = '" + rid + "'")
        persisted_art = db_exec("SELECT art_url FROM recognition_history WHERE id = '" + rid + "'")
        assert persisted_template == body["template_id"]
        assert persisted_art == body["art_url"]

        replay = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": _actor_code(), "Idempotency-Key": key},
            json=body,
        )
        assert replay.status_code == 200
        assert replay.json()["recognition_id"] == rid
        assert db_exec("SELECT count(*) FROM recognition_history WHERE id = '" + rid + "'") == "1"

    def test_unknown_value_is_404_value_not_found() -> None:
        body = {
            "to_user_ids": [_recipient()],
            "value_id": str(uuid.uuid4()),
            "points": 10,
            "message": "value never existed — C5497",
        }
        response = client.post("/api/v1/recognitions", headers={"X-Demo-User": _actor_code()}, json=body)
        assert response.status_code == 404
        assert response.json()["detail"] == "value_not_found"

    def test_unknown_template_is_404_template_not_found() -> None:
        body = {
            "to_user_ids": [_recipient()],
            "value_id": _value_id("customer_first"),
            "template_id": str(uuid.uuid4()),
            "points": 10,
            "message": "template never existed — C5498",
        }
        response = client.post("/api/v1/recognitions", headers={"X-Demo-User": _actor_code()}, json=body)
        assert response.status_code == 404
        assert response.json()["detail"] == "template_not_found"

    def test_template_of_other_value_is_422_template_value_mismatch() -> None:
        other_template = _template_for("innovation")
        response = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": _actor_code()},
            json={
                "to_user_ids": [_recipient()],
                "value_id": _value_id("customer_first"),
                "template_id": other_template,
                "points": 10,
                "message": "mismatched pair — C5499",
            },
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "template_value_mismatch"
