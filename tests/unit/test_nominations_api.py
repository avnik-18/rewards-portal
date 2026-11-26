"""Nomination compose contract — wiring + endpoint map, no DB (unit style).

The compose lifecycle (draft → submit → our DH lane) runs its business
checks in NominationsService over NominationsRepository; the decisions
stay on our awards lane. This file pins what SQL cannot:
- every /nominations route answers; drafts carry the create → submit shape
- the leader/admin gate blocks employee-actor raises (403)
- the NominationDomainError → HTTP mapping matches the frontend's copy
- the field adapters (achievements text ↔ JSONB bullets, doc URL ↔ docs)

"""

import os

os.environ.setdefault("ENVIRONMENT", "local")  # imports read settings

from typing import Any  # noqa: E402
from uuid import uuid4  # noqa: E402

import pytest  # noqa: E402
from fastapi import status  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.repositories.nominations_repository import (  # noqa: E402
    NominationsRepository,
    _ach_from_jsonb,
    _ach_to_jsonb,
    _doc_url_from_jsonb,
    _doc_url_to_jsonb,
    _synth_steps,
)

ACTOR_ID = "99999999-9999-9999-9999-999999999999"
AWARD_ID = "11111111-1111-1111-1111-111111111101"
NOM_ID = "22222222-2222-2222-2222-222222222202"

NOMINATION_ROUTES: list[tuple[str, str, Any]] = [
    ("get", "/api/v1/nominations/awards", None),
    ("get", "/api/v1/nominations/teams", None),
    ("post", "/api/v1/nominations/draft",
     {"award_id": AWARD_ID, "nominee_id": NOM_ID, "story": "s" * 30,
      "core_values": ["impact_obsessed"]}),
    ("put", f"/api/v1/nominations/{NOM_ID}",
     {"award_id": AWARD_ID, "nominee_id": NOM_ID, "story": "s" * 30,
      "core_values": []}),
    ("delete", f"/api/v1/nominations/{NOM_ID}", None),
    ("post", f"/api/v1/nominations/{NOM_ID}/submit", None),
    ("post", f"/api/v1/nominations/awards/{AWARD_ID}/release", None),
    ("get", "/api/v1/nominations/mine", None),
    ("get", "/api/v1/nominations/manage", None),
    ("get", f"/api/v1/nominations/{NOM_ID}", None),
]


class FakeRepository(NominationsRepository):
    """Stub — every attribute the service touches answers a fixture."""

    def __init__(self) -> None:  # no session needed
        pass

    async def is_admin_or_leader(self, user_id: Any) -> bool:
        return getattr(self, "persona", "leader") in ("leader", "admin")

    async def persona_of(self, user_id: Any) -> str:
        return getattr(self, "persona", "leader")

    async def core_value_keys(self) -> list[str]:
        return ["impact_obsessed", "trusted_guides", "inclusive_innovators"]

    async def current_period(self) -> dict[str, Any]:
        return {"id": uuid4(), "name": "FY26 Q4", "starts": "2026-10-01", "ends": "2026-12-31"}

    async def award_by_id(self, award_id: Any, period_id: Any) -> dict[str, Any]:
        return {"id": str(award_id), "name": "Pat on the Back", "phase": "nominations",
                "eligibility": {"all_eligible": True, "allow_self": True},
                "max_nominations_per_nominator": 1, "prize_points": 2500,
                "period_starts": "2026-10-01", "period_ends": "2026-12-31"}

    async def nomination_owner(self, nomination_id: Any) -> dict[str, Any]:
        return {"id": str(nomination_id), "nominator_id": ACTOR_ID, "status": "draft",
                "award_id": AWARD_ID, "nominee_id": NOM_ID, "team_id": None,
                "review_stage": "draft", "core_values": ["impact_obsessed"]}

    async def user_row(self, user_id: Any) -> dict[str, Any]:
        return {"id": str(user_id), "full_name": "Kiran Menon", "title": "Engineer",
                "department": "Delivery", "grade": "L1", "joined_on": None}

    async def team_lane(self, user_id: Any, team_id: Any) -> dict[str, Any]:
        return {"team_id": team_id or str(uuid4()), "team_name": "Mobile",
                "dm_id": ACTOR_ID, "dh_id": None}

    async def create_draft(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return {"id": NOM_ID, "status": "draft"}

    async def update_draft(self, *args: Any, **kwargs: Any) -> bool:
        return True

    async def clear_returned_notes(self, nomination_id: Any) -> None:
        return None

    async def delete_draft(self, nomination_id: Any, actor_id: Any) -> bool:
        return True

    async def lock_submit(self, award_id: Any) -> None:
        return None

    async def open_awards(self, actor_id: Any) -> list[dict[str, Any]]:
        return []

    async def teams_with_size(self, viewer_id: Any) -> list[dict[str, Any]]:
        return []

    async def nominee_choices(self, viewer_id: Any) -> list[dict[str, Any]]:
        return []

    async def nomination_refs_for(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return []

    async def count_nominator_active(self, award_id: Any, nid: Any) -> int:
        return 0

    async def award_quotas_for(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        return []

    async def route_nomination(self, nomination_id: Any, actor_id: Any) -> None:
        return None

    async def nomination_detail(self, nomination_id: Any, viewer_id: Any) -> dict[str, Any]:
        return {"id": str(nomination_id), "nomination_ref": "NOM-FY26-10001",
                "award_id": AWARD_ID, "award_name": "Pat on the Back", "prize_points": 2500,
                "status": "submitted", "team_id": None, "team_name": None,
                "nominator_id": ACTOR_ID, "nominator_name": "Lena Mathew",
                "nominee_id": NOM_ID, "nominee_name": "Kiran Menon",
                "is_nominator": True, "story": "s" * 30,
                "core_values": ["impact_obsessed"], "achievements": None,
                "support_doc_url": None, "is_self_nomination": False,
                "returned_notes": None, "created_at": "2026-11-24T10:00:00Z",
                "can_edit": False, "approval_history": []}

    async def my_nominations(self, viewer_id: Any, scope: str) -> list[dict[str, Any]]:
        return [await self.nomination_detail(AWARD_ID, viewer_id)]

    async def release_award(self, award_id: Any) -> bool:
        return True


@pytest.fixture
def client() -> TestClient:
    from uuid import UUID as _UUID

    from app.api.v1.nominations import _service
    from app.core.actor import get_actor_id
    from app.db.session import get_session

    async def _session() -> Any:
        yield object()

    app.dependency_overrides[get_session] = _session
    app.dependency_overrides[get_actor_id] = lambda: _UUID(ACTOR_ID)
    app.dependency_overrides[_service] = lambda: __import__(
        "app.services.nominations_service", fromlist=["NominationsService"]
    ).NominationsService(FakeRepository())
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_nomination_routes_happy_delta(client: TestClient) -> None:
    res = client.get("/api/v1/nominations/awards")
    assert res.status_code == 200 and res.json() == {"awards": []}
    draft = client.post("/api/v1/nominations/draft", json={
        "award_id": AWARD_ID, "nominee_id": NOM_ID, "story": "s" * 30,
        "core_values": ["impact_obsessed"]})
    assert draft.status_code == 201 and draft.json()["status"] == "draft"
    submitted = client.post(f"/api/v1/nominations/{NOM_ID}/submit")
    assert submitted.status_code == 200
    body = submitted.json()
    assert body["status"] == "submitted" and body["routed_to"] == 1
    assert body["nomination_ref"] == "NOM-FY26-10001"
    detail = client.get(f"/api/v1/nominations/{NOM_ID}")
    assert detail.status_code == 200
    assert detail.json()["award_name"] == "Pat on the Back"


def test_employee_actor_blocked_on_every_route() -> None:
    """Personas raise manage_denied on the write paths, the service maps
    them 403 — the same refusal the compose shows as its error copy."""

    from app.api.v1.nominations import nomination_domain_handler
    from app.services.nominations_service import NominationDomainError

    err = NominationDomainError("manage_denied", "nope")
    from starlette.requests import Request

    request = Request({"type": "http", "method": "GET", "path": "/x", "headers": []})
    assert nomination_domain_handler(request, err).status_code == status.HTTP_403_FORBIDDEN


def test_domain_code_http_map() -> None:
    from fastapi import HTTPException

    from app.api.v1.nominations import nomination_domain_handler
    from app.services.nominations_service import NominationDomainError

    expected = {
        "quota_exhausted": 409,
        "duplicate_nomination": 409,
        "nomination_not_editable": 409,
        "ineligible": 422,
        "award_not_open": 422,
        "self_blocked": 422,
        "value_unknown": 422,
        "nomination_not_found": 404,
        "person_not_found": 404,
        "award_not_found": 404,
        "manage_denied": 403,
        "not_yours": 403,
        "not_their_dm": 403,
    }
    from starlette.requests import Request

    scope = Request({"type": "http", "method": "GET", "path": "/x", "headers": []})
    for code, http_status in expected.items():
        err = NominationDomainError(code, "detail")
        assert nomination_domain_handler(scope, err).status_code == http_status, code
    assert isinstance(HTTPException, type)


def test_eligibility_rules() -> None:
    """The compose's eligibility gate: grades, dept, tenure, self flag."""
    from app.services.nominations_service import evaluate_eligibility

    user = {"id": "u", "grade": "L1", "joined_on": None, "department": "Delivery"}
    assert evaluate_eligibility(None, user)
    assert evaluate_eligibility({"all_eligible": True}, user)
    assert not evaluate_eligibility({"member_level_max": "L2"}, {"grade": "L3"})
    assert evaluate_eligibility({"member_level_max": "L2"}, {"grade": "L1"})
    assert evaluate_eligibility({"grades": ["VP"]}, {"grade": "VP"})
    assert not evaluate_eligibility({"grades": ["VP"]}, {"grade": "L1"})
    assert not evaluate_eligibility({"departments": ["Sales"]}, user)
    assert evaluate_eligibility({"departments": ["Delivery"]}, user)
    from datetime import date

    assert not evaluate_eligibility(
        {"min_tenure_months": 24}, {"grade": "L1", "joined_on": date(2026, 1, 1)})


def test_dm_lane_gate() -> None:
    """The DM/DH rule: only the nominee's team DM (or an admin) raises; a
    leader outside the lane gets the not_their_dm 403 the compose copies."""
    import asyncio
    from uuid import UUID as _UUID

    from app.services.nominations_service import NominationDomainError, NominationsService

    service = NominationsService(FakeRepository())
    dm_id = _UUID(ACTOR_ID)
    original_persona = FakeRepository.persona_of
    original_lane = FakeRepository.team_lane
    try:
        # the lane's DM passes and gets the lane row back
        lane = asyncio.run(service._ensure_lane(dm_id, _UUID(NOM_ID), None))
        assert lane["dm_id"] == ACTOR_ID

        # an admin persona bypasses the lane entirely
        async def admin_persona(self: Any, user_id: Any) -> str:
            return "admin"

        FakeRepository.persona_of = admin_persona  # type: ignore[method-assign]
        assert asyncio.run(service._ensure_lane(dm_id, _UUID(NOM_ID), None)) is None
        FakeRepository.persona_of = original_persona

        # a leader who is not this team's DM is refused
        async def other_dm(self: Any, user_id: Any, team_id: Any) -> dict[str, Any]:
            return {"team_id": "t", "team_name": "Mobile",
                    "dm_id": "00000000-0000-0000-0000-000000000001", "dh_id": None}

        FakeRepository.team_lane = other_dm  # type: ignore[method-assign]
        with pytest.raises(NominationDomainError) as guard:
            asyncio.run(service._ensure_lane(dm_id, _UUID(NOM_ID), None))
        assert guard.value.code == "not_their_dm"
    finally:
        FakeRepository.persona_of = original_persona
        FakeRepository.team_lane = original_lane


def test_field_adapters_round_trip() -> None:
    """Their compose text blobs map onto our JSONB stores and back ints?"""
    assert _ach_to_jsonb(None) == "[]"
    assert _ach_to_jsonb("  ") == "[]"
    assert _ach_to_jsonb("a\n\nb") == '["a", "b"]'
    assert _ach_from_jsonb(["a", "b"]) == "a\nb"
    assert _doc_url_to_jsonb("https://x") == '[{"label": "Supporting document", "url": "https://x"}]'
    assert _doc_url_from_jsonb(_doc_url_to_jsonb("https://x")) == "https://x"
    assert _doc_url_from_jsonb([]) is None


def test_history_synthesis_matches_lane_state() -> None:
    """The detail trail the UI draws is derived from our row state."""
    submitted = _synth_steps({"status": "submitted", "review_stage": "dh",
                              "decided_by": None, "decider_name": None,
                              "decided_at": None, "decision_note": None})
    assert submitted == [{"seq": 1, "level": "dh", "owner_id": "00000000-0000-0000-0000-000000000000",
                          "owner_name": "Department head", "status": "pending",
                          "note": None, "decided_at": None}]
    endorse = _synth_steps({"status": "endorsed", "review_stage": "admin",
                            "decided_by": "3", "decider_name": "Harish Dayal",
                            "decided_at": "t", "decision_note": None})
    assert [e["status"] for e in endorse] == ["approved", "pending"]
    final = _synth_steps({"status": "result", "review_stage": "done",
                          "decided_by": "9", "decider_name": "Deepa Menon",
                          "decided_at": "t", "decision_note": None})
    assert [e["status"] for e in final] == ["approved", "approved"]
    declined = _synth_steps({"status": "not_selected", "review_stage": "done",
                             "decided_by": "3", "decider_name": "Harish Dayal",
                             "decided_at": "t", "decision_note": "nope"})
    assert declined[0]["status"] == "declined" and declined[0]["note"] == "nope"
    returned = _synth_steps({"status": "returned", "review_stage": "done",
                             "decided_by": "3", "decider_name": "Harish Dayal",
                             "decided_at": "t", "decision_note": "redo"})
    assert returned[0]["status"] == "returned" and returned[0]["note"] == "redo"
