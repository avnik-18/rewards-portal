"""People + values read-path rules — repository stubbed; no DB needed.

The SQL-side invariants (actor/guest/eligibility exclusions, ILIKE matching,
values-to-templates nesting) are enforced by the queries in
DirectoryRepository and ValuesRepository; these unit tests pin the contracts
the SQL can not: row passthrough, query-param forwarding, the identity gate
on caller-scoped /people, route response shapes, and art_json tolerance
(missing / empty / non-array urls never error).
"""

from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1 import directory as directory_router
from app.api.v1 import values as values_router
from app.core.actor import get_actor_id
from app.main import app
from app.repositories.values_repository import ValuesRepository
from app.schemas.values import ValueRowResponse
from app.services.directory_service import DirectoryService
from app.services.values_service import ValuesService


class FakeDirectoryRepository:
    """Recorded stand-in for DirectoryRepository.list_people's contract."""

    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows
        self.calls: list[dict[str, Any]] = []

    async def list_people(self, actor_id: Any, limit: int, search: str | None) -> list[dict[str, Any]]:
        self.calls.append({"actor_id": actor_id, "limit": limit, "search": search})
        return self._rows


class FakeValuesRepository:
    """Matches ValuesRepository.active_values_with_templates' nested contract."""

    def __init__(self, values: list[dict[str, Any]]) -> None:
        self._values = values

    async def active_values_with_templates(self) -> list[dict[str, Any]]:
        return self._values


# --- service-level rules -----------------------------------------------------


async def test_people_rows_pass_through_untouched() -> None:
    """Sort/exclusions are the SQL's job — the service trusts its rows."""
    rows = [
        dict(
            id=uuid4(),
            employee_code="E-RH",
            full_name="Rahul Nair",
            email="rahul@emids.test",
            title="Engineer",
            department="Engineering",
            manager_id=None,
            manager_code="E-L1",
            manager_name="Sam Fernandes",
        ),
        dict(
            id=uuid4(),
            employee_code="E-BR",
            full_name="Brooke Davis",
            email="brooke@emids.test",
            title="Executive Assistant",
            department="Operations",
            manager_id=None,
            manager_code=None,
            manager_name=None,
        ),
    ]
    repo = FakeDirectoryRepository(rows)
    actor_id = uuid4()

    people = await DirectoryService(repo).list_people(actor_id=actor_id, limit=500, search=None)

    assert people == rows
    assert repo.calls == [{"actor_id": actor_id, "limit": 500, "search": None}]


async def test_people_limit_and_search_forward_to_repository() -> None:
    repo = FakeDirectoryRepository([])
    actor_id = uuid4()

    people = await DirectoryService(repo).list_people(actor_id=actor_id, limit=7, search=" Pri ")

    assert people == []
    assert repo.calls == [{"actor_id": actor_id, "limit": 7, "search": " Pri "}]


async def test_values_rows_pass_through_untouched() -> None:
    template_id, value_id = uuid4(), uuid4()
    rows = [
        dict(
            id=value_id,
            key="collaboration",
            label="Collaboration",
            templates=[
                dict(
                    id=template_id,
                    name="Thank you",
                    emoji="👏",
                    art_urls=["https://cdn.test/a.png"],
                    prefill="Well done!",
                )
            ],
        ),
        dict(id=uuid4(), key="innovation", label="Innovation", templates=[]),
    ]
    repo = FakeValuesRepository(rows)

    values = await ValuesService(repo).active_values()

    assert values == [ValueRowResponse(**row) for row in rows]


# --- art_json tolerance (ValuesRepository, session faked at the seam) --------


class FakeResult:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    def mappings(self) -> "FakeResult":
        return self

    def all(self) -> list[dict[str, Any]]:
        return self._rows


class FakeSession:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows

    async def execute(self, query: Any, params: Any = None) -> FakeResult:
        return FakeResult(self._rows)


def _template_row(value_id: Any, template_id: Any, art_json: Any) -> dict[str, Any]:
    return dict(
        value_id=value_id,
        value_key="collaboration",
        value_label="Collaboration",
        template_id=template_id,
        template_name="Thank you",
        template_emoji="👏",
        template_art_json=art_json,
        template_prefill=None,
    )


async def test_art_urls_extracted_from_object_array() -> None:
    value_id, template_id = uuid4(), uuid4()
    row = _template_row(value_id, template_id, {"urls": ["https://cdn.test/a.png", "https://cdn.test/b.mp4"]})
    repo = ValuesRepository(FakeSession([row]))

    values = await repo.active_values_with_templates()

    assert values[0]["templates"][0]["art_urls"] == ["https://cdn.test/a.png", "https://cdn.test/b.mp4"]


async def test_art_urls_empty_when_art_json_empty_or_none() -> None:
    value_id = uuid4()
    rows = [_template_row(value_id, uuid4(), {}), _template_row(value_id, uuid4(), None)]
    repo = ValuesRepository(FakeSession(rows))

    values = await repo.active_values_with_templates()

    assert [t["art_urls"] for t in values[0]["templates"]] == [[], []]


async def test_art_urls_empty_when_art_json_or_urls_not_an_array() -> None:
    value_id = uuid4()
    rows = [
        _template_row(value_id, uuid4(), "https://cdn.test/logo.png"),  # whole jsonb is a scalar
        _template_row(value_id, uuid4(), {"urls": "https://cdn.test/a.png"}),  # urls member non-array
        _template_row(value_id, uuid4(), {"urls": [42, "https://cdn.test/ok.png"]}),  # non-str members
    ]
    repo = ValuesRepository(FakeSession(rows))

    values = await repo.active_values_with_templates()

    assert [t["art_urls"] for t in values[0]["templates"]] == [[], [], ["https://cdn.test/ok.png"]]


async def test_value_without_active_templates_keeps_empty_list_and_left_join_miss_skipped() -> None:
    """A LEFT JOIN miss (no active template row) must not invent a template."""
    value_id = uuid4()
    rows = [
        dict(
            value_id=value_id,
            value_key="ownership",
            value_label="Ownership",
            template_id=None,
            template_name=None,
            template_emoji=None,
            template_art_json=None,
            template_prefill=None,
        )
    ]
    repo = ValuesRepository(FakeSession(rows))

    values = await repo.active_values_with_templates()

    assert values == [dict(id=value_id, key="ownership", label="Ownership", templates=[])]


# --- route-level (dependency overrides against the real app) -----------------


@pytest.fixture
def overrides() -> Any:
    try:
        yield app.dependency_overrides
    finally:
        app.dependency_overrides.clear()


def _person_row(employee_code: str, full_name: str, manager: dict[str, Any] | None) -> dict[str, Any]:
    manager_id = manager["id"] if manager else None
    return dict(
        id=uuid4(),
        employee_code=employee_code,
        full_name=full_name,
        email=f"{full_name.split()[0].lower()}@emids.test",
        title=None,
        department=None,
        manager_id=manager_id,
        manager_code=manager["code"] if manager else None,
        manager_name=manager["name"] if manager else None,
    )


def test_people_route_without_demo_header_is_rejected_400() -> None:
    # caller-scoped route: in local mode the identity gate fires BEFORE any
    # repository runs — fixture style of test_walking_skeleton.
    with TestClient(app) as client:
        assert client.get("/api/v1/people").status_code == 400


def test_people_route_returns_bare_list_with_manager_fields(overrides: Any) -> None:
    actor_id = uuid4()
    manager = {"id": uuid4(), "code": "E-L1", "name": "Sam Fernandes"}
    row = _person_row("E-RH", "Rahul Nair", manager)
    repo = FakeDirectoryRepository([row])
    overrides[directory_router._service] = lambda: DirectoryService(repo)
    overrides[get_actor_id] = lambda: actor_id

    with TestClient(app) as client:
        r = client.get("/api/v1/people", headers={"X-Demo-User": "E-PR"})

    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    assert [p["employee_code"] for p in body] == ["E-RH"]
    assert dict(body[0]) == {
        # UUIDs arrive as JSON strings over the wire
        "id": str(row["id"]),
        "employee_code": "E-RH",
        "full_name": "Rahul Nair",
        "email": "rahul@emids.test",
        "title": None,
        "department": None,
        "manager_id": str(manager["id"]),
        "manager_code": "E-L1",
        "manager_name": "Sam Fernandes",
    }
    assert repo.calls[0]["actor_id"] == actor_id


def test_people_route_forwards_limit_and_search_params(overrides: Any) -> None:
    repo = FakeDirectoryRepository([])
    overrides[directory_router._service] = lambda: DirectoryService(repo)
    overrides[get_actor_id] = lambda: uuid4()

    with TestClient(app) as client:
        r = client.get("/api/v1/people", headers={"X-Demo-User": "E-PR"}, params={"limit": 7, "search": "Priya"})

    assert r.status_code == 200, r.text
    assert r.json() == []
    assert repo.calls[0]["limit"] == 7 and repo.calls[0]["search"] == "Priya"


def test_values_route_gated_but_not_scoped_returns_nested_shape(overrides: Any) -> None:
    rows = [
        dict(
            id=uuid4(),
            key="collaboration",
            label="Collaboration",
            templates=[dict(id=uuid4(), name="Thank you", emoji="👏", art_urls=[], prefill="Great job!")],
        ),
    ]
    overrides[values_router._service] = lambda: ValuesService(FakeValuesRepository(rows))
    overrides[get_actor_id] = lambda: uuid4()

    with TestClient(app) as client:
        r = client.get("/api/v1/values", headers={"X-Demo-User": "E-PR"})  # gated like every route

    assert r.status_code == 200, r.text
    body = r.json()
    assert isinstance(body, list)
    assert body[0]["key"] == "collaboration" and body[0]["templates"][0]["prefill"] == "Great job!"
    assert body[0]["templates"][0]["art_urls"] == []
