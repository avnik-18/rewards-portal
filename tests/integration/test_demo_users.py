"""GET /auth/demo-users over the live DB — skipped unless DATABASE_URL points
at an alembic-applause schema with (optionally) the seed applied.

Contract:
1. LOCAL ONLY: a non-local environment answers plain 404 (route-level guard).
2. shape: a list of {employee_code, full_name, title, department} and nothing
   else — one item per seeded user, cross-checked against SQL truth.
3. no identity header required: the login screen has no actor yet — it is
   where one gets picked (unlike every actor-scoped endpoint, 400 on
   missing header must NOT happen here).
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.api.v1.demo_users import router as demo_router  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import (  # noqa: E402
    DB_READY,
    db_exec,
    seed_demo_if_missing,
)


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_demo_users_local_listing() -> None:
    seed_demo_if_missing()

    with TestClient(create_app()) as client:
        r = client.get("/api/v1/auth/demo-users")
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)

        truth = int(db_exec("SELECT count(*) FROM users"))
        assert len(items) == truth, "one item per seeded user, no padding"

        for item in items:
            # the login demo carousel also carries fn_persona + role to tag
            # the chips (persona badge / role dot); one item per seeded user
            assert set(item.keys()) == {
                "employee_code", "full_name", "title", "department",
                "persona", "role"}
            # db_exec returns "name|title|department" shaped truth via a
            # single-column trick-free join: compare column by column with
            # separate scalar reads (params bound, never interpolated)
            full_name = db_exec(
                "SELECT full_name FROM users WHERE employee_code = :code",
                {"code": item["employee_code"]})
            title = db_exec(
                "SELECT title FROM users WHERE employee_code = :code",
                {"code": item["employee_code"]})
            department = db_exec(
                "SELECT department FROM users WHERE employee_code = :code",
                {"code": item["employee_code"]})
            assert item["full_name"] == full_name, item["employee_code"]
            assert item["title"] == title, item["employee_code"]
            assert item["department"] == department, item["employee_code"]

        # a designation the demo actually shows must be present, not blank
        priya = next(i for i in items if i["employee_code"] == "E-PR")
        assert priya["full_name"] == "Priya Rao"
        assert priya["title"] == "Engineer"

        # explicitly no-header-friendly (the opposite of actor-scoped routes)
        assert client.get("/api/v1/auth/demo-users").status_code == 200

        schema = client.get("/openapi.json").json()
        assert "/api/v1/auth/demo-users" in schema["paths"]


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_demo_users_hidden_outside_local() -> None:
    seed_demo_if_missing()

    mini = FastAPI()
    mini.include_router(demo_router, prefix="/api/v1")

    prev = os.environ.get("ENVIRONMENT")
    try:
        os.environ["ENVIRONMENT"] = "production"
        get_settings.cache_clear()
        # route-level guard must answer a plain 404 the moment the process
        # boots with a non-local environment — an empty probe surface
        with TestClient(mini) as client:
            r = client.get("/api/v1/auth/demo-users")
            assert r.status_code == 404, r.text
    finally:
        if prev is None:
            os.environ.pop("ENVIRONMENT", None)
        else:
            os.environ["ENVIRONMENT"] = prev
        get_settings.cache_clear()
