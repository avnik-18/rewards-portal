"""People/values read path over the live DB — skipped unless DATABASE_URL
points at an alembic-applause schema with (optionally) seed/demo.sql applied.

The actor identity is sent via the X-Demo-User header (dev fallback mode).
exclusions (self, guests, ineligible) are pinned against the demo seed's
staff chain: E-RH/E-AJ report to E-L1. The demo seed currently has NO active
recognition_templates rows — /values must return values with EMPTY template
lists there (the template seed lands with the write-path branch, so these
tests tolerate 0 templates instead of failing hard).
"""

import os
import sys  # noqa: F401
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import DB_READY, seed_demo_if_missing  # noqa: E402


@pytest.mark.skipif(not DB_READY, reason="no live recog DB (set DATABASE_URL)")
def test_people_excludes_self_and_keeps_manager_fields() -> None:
    seed_demo_if_missing()
    with TestClient(create_app()) as client:
        r = client.get("/api/v1/people", headers={"X-Demo-User": "E-PR"})
        assert r.status_code == 200, r.text
        body = r.json()
        codes = {p["employee_code"] for p in body}

        # the acting user can never recognize themselves
        assert "E-PR" not in codes, "actor must be excluded from /people"
        # guests/ineligible: not present in the demo seed — the exclusion runs
        # in the SQL, so assert structurally instead (report chain intact):
        assert {"E-RH", "E-AJ", "E-BR", "E-L1", "E-L2", "E-L3"} <= codes, "active chain must stay"
        everyone = {p["employee_code"]: p for p in body}
        assert everyone["E-RH"]["manager_code"] == "E-L1"
        assert everyone["E-RH"]["manager_name"] == "Sam Fernandes"
        assert everyone["E-L1"]["manager_code"] == "E-L2"
        assert everyone["E-L3"]["manager_id"] is None and everyone["E-L3"]["manager_code"] is None


@pytest.mark.skipif(not DB_READY, reason="no live recog DB (set DATABASE_URL)")
def test_people_search_and_limit_are_applied() -> None:
    seed_demo_if_missing()
    with TestClient(create_app()) as client:
        r = client.get("/api/v1/people", headers={"X-Demo-User": "E-RH"}, params={"search": "Priya"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert all("Priya" in p["full_name"] for p in body)
        assert {p["full_name"] for p in body} == {"Priya Rao"}

        r = client.get("/api/v1/people", headers={"X-Demo-User": "E-PR"}, params={"limit": 2})
        assert r.status_code == 200, r.text
        assert len(r.json()) == 2

        # param bounds live on the router: 0 and 1001 are rejected before SQL
        assert client.get("/api/v1/people", headers={"X-Demo-User": "E-PR"}, params={"limit": 0}).status_code == 422
        assert client.get("/api/v1/people", headers={"X-Demo-User": "E-PR"}, params={"limit": 1001}).status_code == 422


@pytest.mark.skipif(not DB_READY, reason="no live recog DB (set DATABASE_URL)")
def test_values_returns_active_values_and_tolerates_zero_templates() -> None:
    seed_demo_if_missing()
    with TestClient(create_app()) as client:
        # the catalog is not caller-scoped but is still identity-gated like every route
        r = client.get("/api/v1/values", headers={"X-Demo-User": "E-PR"})
        assert r.status_code == 200, r.text
        body = r.json()
        keys = {v["key"] for v in body}
        # 0030: the three live program values (the old five retired)
        assert {"impact_obsessed", "trusted_guides", "inclusive_innovators"} == keys
        # the shape holds even while the template seed has not landed yet
        for value in body:
            assert set(value) == {"id", "key", "label", "templates"}
            assert value["templates"] == [] or all(
                set(t) == {"id", "name", "emoji", "art_urls", "prefill"} and isinstance(t["art_urls"], list)
                for t in value["templates"]
            )
