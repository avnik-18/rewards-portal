"""Admin awards contract — wiring + endpoint map, no DB (tests/unit style).

The fn-side behavior (forward-only phases, validation, the live-cycle
tile predicate) runs IN the DB and is pinned by the live tier:
tests/integration/test_admin_awards_fns.py. This file pins what SQL cannot:
- the admin persona gate blocks every /admin/* route BEFORE any work (403)
- get_admin_id resolves an admin and rejects everyone else (fn_persona)
- the code→HTTP mapping of the AdminAwardsDomainError handler
- the service adapter translates SQLSTATEs to the stable codes
"""

import os

os.environ.setdefault("ENVIRONMENT", "local")  # imports read settings

from typing import Any
from unittest.mock import AsyncMock  # noqa: E402
from uuid import UUID, uuid4  # noqa: E402

import pytest  # noqa: E402
from fastapi import HTTPException, status  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from starlette.requests import Request  # noqa: E402

from app.core.actor import get_admin_id  # noqa: E402
from app.main import app  # noqa: E402
from app.repositories.me_repository import MeRepository  # noqa: E402
from app.services.admin_awards_service import (  # noqa: E402
    AdminAwardsDomainError,
    AdminAwardsService,
)

ADMIN_ID = "99999999-9999-9999-9999-999999999999"
PID = "11111111-1111-1111-1111-111111111101"

ADMIN_ROUTES: list[tuple[str, str, Any]] = [
    ("get", "/api/v1/admin/awards/cycles", None),
    ("post", "/api/v1/admin/awards",
     {"period_id": PID, "name": "X", "prize_points": 100}),
    ("put", f"/api/v1/admin/awards/{ADMIN_ID}",
     {"period_id": PID, "name": "X", "prize_points": 100}),
    ("patch", f"/api/v1/admin/awards/{ADMIN_ID}/phase", {"phase": "nominations"}),
    ("put", f"/api/v1/admin/awards/content/{PID}", {"headline": "h"}),
    # Work Item #3: cycle creation + timeline edit
    ("post", "/api/v1/admin/awards/cycles",
     {"name": "X", "starts": "2038-01-01",
      "ends": "2038-03-31"}),
    ("put", f"/api/v1/admin/awards/cycles/{PID}",
     {"nominations_close": "2038-02-01"}),
    # 0034: the admin final lane — get_admin_id-gated like /admin/* above
    ("get", "/api/v1/awards/approvals/admin/pending", None),
    ("patch", f"/api/v1/awards/nominations/{ADMIN_ID}/admin-decision",
     {"decision": "approved"}),
]


@pytest.fixture
def blocked_client() -> TestClient:
    app.dependency_overrides[get_admin_id] = _deny_admin
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


def _deny_admin() -> None:
    raise HTTPException(status.HTTP_403_FORBIDDEN, "admin persona required")


def test_non_admin_is_403_on_every_admin_route(blocked_client: TestClient) -> None:
    """The gate sits ON the routes: with the persona check refusing, all five
    admin routes answer 403 and the service is never reached."""
    for method, path, body in ADMIN_ROUTES:
        kwargs = {"json": body} if body is not None else {}
        response = getattr(blocked_client, method)(path, **kwargs)
        assert response.status_code == status.HTTP_403_FORBIDDEN, (method, path)


async def test_get_admin_id_passes_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})
    monkeypatch.setattr(
        MeRepository, "persona", AsyncMock(return_value="admin"),
    )
    actor = await get_admin_id(request, actor_id=UUID(ADMIN_ID), session=object())
    assert actor == UUID(ADMIN_ID)
    assert str(request.state.actor_id) == ADMIN_ID


async def test_get_admin_id_blocks_leader(monkeypatch: pytest.MonkeyPatch) -> None:
    """leaders/employees never pass — not even a team lead."""
    request = Request({"type": "http", "method": "GET", "path": "/", "headers": []})
    for persona in ("leader", "employee"):
        monkeypatch.setattr(MeRepository, "persona", AsyncMock(return_value=persona))
        with pytest.raises(HTTPException) as err:
            await get_admin_id(request, actor_id=uuid4(), session=object())
        assert err.value.status_code == status.HTTP_403_FORBIDDEN


def test_admin_sqlstate_map() -> None:
    from app.services.recognition_service import _SQLSTATE_TO_CODE

    assert _SQLSTATE_TO_CODE["C549W"] == "admin_validation"
    assert _SQLSTATE_TO_CODE["C549X"] == "award_locked"
    assert _SQLSTATE_TO_CODE["C549Q"] == "insufficient_privilege"
    # Work Item #3
    assert _SQLSTATE_TO_CODE["C5490"] == "nomination_window_closed"
    assert _SQLSTATE_TO_CODE["C549J"] == "nomination_limit_reached"


def test_admin_domain_mapping() -> None:
    from app.api.v1.admin_awards import admin_awards_domain_handler

    scope = {"type": "http", "method": "GET", "path": "/x", "headers": []}
    request = Request(scope)
    expected = {
        "insufficient_privilege": 403,
        "admin_validation": 400,
        "award_locked": 400,
        # Work Item #3 nominations slice
        "item_not_found": 404,
        "person_not_found": 404,
        "item_already_nominated": 409,
        "nomination_limit_reached": 409,
        "nomination_window_closed": 409,
        "person_inactive": 409,
    }
    import json

    for code, status_code in expected.items():
        response = admin_awards_domain_handler(
            request, AdminAwardsDomainError(code, "detail")
        )
        assert response.status_code == status_code, code
        assert json.loads(response.body)["detail"] == code
    with pytest.raises(ValueError):
        admin_awards_domain_handler(request, ValueError("not a domain error"))


class FakeAdminAwardsRepository:
    """In-memory double — records upserts so create-then-list round-trips."""

    def __init__(self) -> None:
        self.awards: list[dict[str, Any]] = []

    async def list_cycles(self, actor_id: object) -> list[dict[str, Any]]:
        return [{
            "id": PID,
            "name": "FY26 Q4",
            "starts": "2026-10-01",
            "ends": "2026-12-31",
            "is_current": True,
            "content": None,
            "awards": self.awards,
        }]

    async def upsert_award(
        self, actor_id: object, period_id: object, award_id: object, name: str,
        value_id: object, prize_points: int, nominations_end: object,
        nominations_start: object, requires_jury: bool, max_nominations: int = 1,
        cadence: str = "quarterly", description: str | None = None,
        photo_url: str | None = None,
        guidelines: list[dict[str, Any]] | None = None,
        approval_start: object = None,
        approval_end: object = None,
    ) -> UUID:
        award = {
            "id": str(uuid4()), "name": name, "prize_points": prize_points,
            "phase": "draft", "nominations_start": nominations_start,
            "nominations_end": nominations_end,
            "max_nominations_per_nominator": max_nominations,
            "description": description, "photo_url": photo_url,
            "cadence": cadence, "guidelines": guidelines,
            "approval_start": approval_start, "approval_end": approval_end,
        }
        self.awards.append(award)
        return UUID(award["id"])

    # unimplemented doubles must fail loudly, never fake success
    async def set_award_phase(self, *_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("unit tier does not drive fn phase transitions")

    async def upsert_cycle_content(self, *_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("unit tier does not drive fn content upserts")


def test_create_then_appears_in_list() -> None:
    """Route→service→repository→DTO round-trip with the repository doubled:
    the fn itself is pinned live; the adapter must not drop fields on the
    way through."""
    fake = FakeAdminAwardsRepository()
    app.dependency_overrides[get_admin_id] = _allow_admin
    from app.api.v1.admin_awards import _service

    app.dependency_overrides[_service] = lambda: AdminAwardsService(fake)
    try:
        with TestClient(app) as client:
            created = client.post(
                "/api/v1/admin/awards",
                json={"period_id": PID, "name": "WI1 Round-trip",
                      "prize_points": 7500, "requires_jury": True},
            )
            assert created.status_code == status.HTTP_201_CREATED, created.text
            award_id = created.json()["id"]
            assert award_id

            listed = client.get("/api/v1/admin/awards/cycles")
            assert listed.status_code == status.HTTP_200_OK, listed.text
            periods = listed.json()
            assert isinstance(periods, list)
            awards = periods[0]["awards"]
            assert any(row["id"] == award_id for row in awards)
            row = next(r for r in awards if r["id"] == award_id)
            assert row == {
                "id": award_id,
                "name": "WI1 Round-trip",
                "description": None,
                "photo_url": None,
                "cadence": "quarterly",
                "guidelines": [],
                "prize_points": 7500,
                "phase": "draft",
                "nominations_start": None,
                "nominations_end": None,
                "requires_jury": True,
                "max_nominations_per_nominator": 1,
                "approval_start": None,
                "approval_end": None,
            }
    finally:
        app.dependency_overrides.clear()


def _allow_admin() -> UUID:
    return UUID(ADMIN_ID)
