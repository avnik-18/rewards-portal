"""Nomination business rules — thin over NominationsRepository.

Adapted from the team's feature/myteam-nominations branch: the compose
contract, eligibility/quotas checks and value validation are theirs; the
approval chain is OURS (review_stage on awards_nominations) — after the
service-side checks pass, submit flips the row into the DH queue via
route_nomination; fn_nomination_decide / fn_nomination_admin_decide own
the decisions, so there are no approval_item rows and no item-decide
services here.

Failures surface as NominationDomainError carrying the stable codes their
compose UI already maps to copy (quota_exhausted, duplicate_nomination,
ineligible, self_blocked, award_not_open, value_unknown,
nomination_not_editable, person_not_found); the router maps them to HTTP.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import structlog

from app.repositories.nominations_repository import NominationsRepository

log = structlog.get_logger(__name__)


class NominationDomainError(Exception):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


FORBIDDEN = {"manage_denied", "not_yours", "not_their_dm"}
CONFLICT = {"quota_exhausted", "duplicate_nomination"}
UNPROCESSABLE = {"ineligible", "award_not_open", "team_size_invalid", "self_blocked",
                 "value_unknown"}
NOT_FOUND = {"award_not_found", "nomination_not_found", "person_not_found",
             "nomination_not_editable"}


def _code_status(code: str) -> int:
    from fastapi import status as _status
    if code in UNPROCESSABLE:
        return _status.HTTP_422_UNPROCESSABLE_ENTITY
    if code == "quota_exhausted":
        return _status.HTTP_409_CONFLICT
    if code == "duplicate_nomination":
        return _status.HTTP_409_CONFLICT
    if code == "nomination_not_editable":
        return _status.HTTP_409_CONFLICT
    if code in NOT_FOUND:
        return _status.HTTP_404_NOT_FOUND
    if code in FORBIDDEN:
        return _status.HTTP_403_FORBIDDEN
    return _status.HTTP_500_INTERNAL_SERVER_ERROR


_GRADE_RANK = {"L0": 0, "L1": 1, "L2": 2, "L3": 3, "L4": 4, "L5": 5, "L6": 6,
               "VP": 10, "SVP": 11}


def evaluate_eligibility(
    eligibility: dict[str, Any] | None, user: dict[str, Any],
    now: Any = None) -> bool:
    """True when the user satisfies the award's eligibility JSONB (None or
    all_eligible=true → everyone)."""
    if not eligibility or eligibility.get("all_eligible") is True:
        return True
    grades = eligibility.get("grades") or []
    if grades and (user.get("grade") or "L1") not in grades:
        return False
    cap = eligibility.get("member_level_max")
    if cap and _GRADE_RANK.get(user.get("grade") or "L1", 0) > _GRADE_RANK.get(cap, 99):
        return False
    departments = eligibility.get("departments") or []
    if departments and (user.get("department") or "") not in departments:
        return False
    min_months = eligibility.get("min_tenure_months")
    if min_months:
        joined = user.get("joined_on")
        if not joined:
            return False
        ref = now or datetime.now(UTC)
        months = (ref.year - joined.year) * 12 + ref.month - joined.month
        if months < int(min_months):
            return False
    return True


class NominationsService:
    def __init__(self, repo: NominationsRepository) -> None:
        self._repo = repo

    # ------------------------------------------------------------------ reads

    async def open_awards(self, actor_id: UUID) -> list[dict[str, Any]]:
        awards = await self._repo.open_awards(actor_id)
        result = []
        for a in awards:
            el = a.get("eligibility") or {}
            result.append({
                "award_id": a["award_id"],
                "name": a["name"],
                "description": a["description"],
                "prize_points": int(a["prize_points"]),
                "max_nominations_per_nominator": int(a["max_nominations_per_nominator"]),
                "used_by_nominator": int(a.get("used_by_nominator") or 0),
                "allow_self": bool(el.get("allow_self", False)),
                "allow_team": bool(el.get("allow_team", False)),
                "min_team_size": int(el.get("min_team_size", 1)),
                "member_level_max": el.get("member_level_max"),
                "grades": list(el.get("grades") or []),
                "departments": list(el.get("departments") or []),
                "min_tenure_months": el.get("min_tenure_months"),
                "quotas": list(a.get("quotas") or []),
                "nominations_end": a.get("nominations_end"),
            })
        return result

    async def mine(self, actor_id: UUID) -> list[dict[str, Any]]:
        return await self._repo.my_nominations(actor_id, scope="mine")

    async def manage_list(self, actor_id: UUID) -> list[dict[str, Any]]:
        if not await self._repo.is_admin_or_leader(actor_id):
            raise NominationDomainError("manage_denied", "the manage list is for leaders and admins only")
        return await self._repo.my_nominations(actor_id, scope="manage")

    async def detail(self, actor_id: UUID, nomination_id: UUID) -> dict[str, Any] | None:
        return await self._repo.nomination_detail(nomination_id, actor_id)

    async def teams(self, actor_id: UUID) -> list[dict[str, Any]]:
        """The compose team picker: the caller's DM-owned teams (admin: all)."""
        return await self._repo.teams_with_size(actor_id)

    async def nominee_choices(self, actor_id: UUID) -> list[dict[str, Any]]:
        """The compose nominee picker: the caller's DM-teams' members
        (admin: the whole active directory, plus the caller either way)."""
        return await self._repo.nominee_choices(actor_id)

    async def release_award(self, actor_id: UUID, award_id: UUID) -> dict[str, Any]:
        if (await self._repo.persona_of(actor_id)) != "admin":
            raise NominationDomainError("manage_denied", "only admins release award rounds")
        released = await self._repo.release_award(award_id)
        if not released:
            raise NominationDomainError("award_not_open", "the award is not in a releasable state")
        return {"released": True}

    # ------------------------------------------------------------------ writes

    async def _ensure_lane(
        self, actor_id: UUID, nominee_id: UUID | None, team_id: UUID | None) -> dict[str, Any] | None:
        """The DM/DH rule: an employee nomination is raised by the nominee's
        team's DM, a team nomination by that team's DM; the program admin
        may nominate anyone. Returns the lane row (for team rep fallback)."""
        if (await self._repo.persona_of(actor_id)) == "admin":
            return None
        subject = team_id if team_id is not None else nominee_id
        if subject is None:
            raise NominationDomainError("value_unknown", "pick one person or a team")
        lane = await self._repo.team_lane(subject, team_id)
        if lane is None or lane.get("dm_id") is None or str(lane["dm_id"]) != str(actor_id):
            raise NominationDomainError(
                "not_their_dm",
                "nominations are raised by this team's delivery manager (or a program admin)")
        return lane

    async def draft(
        self, actor_id: UUID, award_id: UUID, nominee_id: UUID | None,
        team_id: UUID | None, story: str, core_values: list[str],
        achievements: str | None, support_doc_url: str | None) -> dict[str, Any]:
        await self._validate_core_values(core_values)
        period = await self._repo.current_period()
        if period is None:
            raise NominationDomainError("award_not_open", "no open awards period")
        award = await self._repo.award_by_id(award_id, period["id"])
        if award is None:
            raise NominationDomainError("award_not_found", "unknown award for the open period")
        if award.get("phase") != "nominations":
            raise NominationDomainError("award_not_open",
                                        "this award's cycle is not in the nominations phase")
        if team_id is not None:
            if nominee_id is not None:
                raise NominationDomainError("value_unknown", "pick either one person or a team, not both")
        if nominee_id is None and team_id is None:
            raise NominationDomainError("value_unknown", "pick one person or a team")

        # the DM/DH rule: the lane's DM (or an admin) raises the nomination —
        # the teammate compose resolves nominees on the handoff URL, so the
        # lane is known here just as it is on submit
        lane = await self._ensure_lane(actor_id, nominee_id, team_id)

        if team_id is not None:
            # team awards: the team's DM stands in as the record-level nominee
            rep_id = (lane.get("dm_id") if lane else None) or None
            if rep_id is None:
                members = await self._repo.team_members_for(team_id)
                rep = next((m for m in members if m.get("role") == "lead"), members[0] if members else None)
                if rep is None:
                    raise NominationDomainError("team_size_invalid", "the team has no current members")
                rep_id = UUID(str(rep["user_id"]))
            nominee_id = rep_id
        if nominee_id is None:
            raise NominationDomainError("value_unknown",
                                        "the nomination lost its nominee — pick a person or a team again")
        user = await self._repo.user_row(nominee_id)
        if user is None:
            raise NominationDomainError("person_not_found", "that person is not in the directory")
        return await self._repo.create_draft(
            actor_id, award_id, nominee_id, team_id, story, core_values,
            achievements, support_doc_url)

    async def update(
        self, actor_id: UUID, nomination_id: UUID,
        body: dict[str, Any]) -> dict[str, str]:
        await self._validate_core_values(body["core_values"])
        owner = await self._repo.nomination_owner(nomination_id)
        if owner is None:
            raise NominationDomainError("nomination_not_found", "nomination not found")
        if str(owner["nominator_id"]) != str(actor_id):
            raise NominationDomainError("not_yours", "only the nominator can edit this nomination")
        await self._ensure_lane(actor_id, body["nominee_id"], body["team_id"])
        updated = await self._repo.update_draft(
            nomination_id, actor_id, body["story"], body["core_values"],
            body["achievements"], body["support_doc_url"],
            body["nominee_id"], body["team_id"])
        if not updated:
            raise NominationDomainError("nomination_not_editable", "the nomination left the editable states")
        await self._repo.clear_returned_notes(nomination_id)
        return {"status": "ok"}

    async def delete(self, actor_id: UUID, nomination_id: UUID) -> bool:
        deleted = await self._repo.delete_draft(nomination_id, actor_id)
        if not deleted:
            owner = await self._repo.nomination_owner(nomination_id)
            if owner is None:
                raise NominationDomainError("nomination_not_found", "nomination not found")
            if str(owner["nominator_id"]) != str(actor_id):
                raise NominationDomainError("not_yours", "only the nominator can delete this nomination")
            raise NominationDomainError("nomination_not_editable", "only drafts can be discarded")
        return True

    async def submit(self, actor_id: UUID, nomination_id: UUID) -> dict[str, Any]:
        owner = await self._repo.nomination_owner(nomination_id)
        if owner is None:
            raise NominationDomainError("nomination_not_found", "nomination not found")
        if str(owner["nominator_id"]) != str(actor_id):
            raise NominationDomainError("not_yours", "only the nominator can submit this nomination")
        if owner["status"] not in ("draft", "returned"):
            raise NominationDomainError("nomination_not_editable", "already submitted")
        await self._ensure_lane(actor_id, owner["nominee_id"], owner["team_id"])

        period = await self._repo.current_period()
        if period is None:
            raise NominationDomainError("award_not_open", "no open awards period")
        award = await self._repo.award_by_id(owner["award_id"], period["id"])
        if award is None:
            raise NominationDomainError("award_not_found",
                                        "the linked award moved periods — recreate the nomination")
        if award.get("phase") != "nominations":
            raise NominationDomainError("award_not_open", "this award's cycle is not in the nominations phase")

        # one at a time per award: quotas are count-based, so serialize
        await self._repo.lock_submit(award["id"])

        el = award.get("eligibility") or {}
        nominee_id = owner["nominee_id"]

        if nominee_id is None:
            raise NominationDomainError("value_unknown", "the nomination lost its nominee — edit and re-save")
        nominee = await self._repo.user_row(nominee_id)
        if nominee is None:
            raise NominationDomainError("person_not_found", "nominee not found")
        await self._validate_core_values(owner_story_values(owner))

        if not evaluate_eligibility(el, nominee):
            raise NominationDomainError("ineligible",
                                        nominee["full_name"] + " does not meet the award criteria")
        if str(nominee_id) == str(owner["nominator_id"]) and not el.get("allow_self"):
            raise NominationDomainError("self_blocked", "this award does not accept self-nominations")

        # duplicate nominee+award in an active state this period
        existing = await self._repo.nomination_refs_for(
            award["id"], period["starts"], period["ends"])
        for row in existing:
            if str(row.get("nominee_id")) == str(nominee_id) \
                    and row["id"] != nomination_id \
                    and row["status"] in ("submitted", "endorsed", "under_review", "approved"):
                raise NominationDomainError("duplicate_nomination",
                                            "this nominee already has an active nomination for this award")

        # per-nominator cap (active nominations of the same period)
        active_of_nominator = await self._repo.count_nominator_active(award["id"], actor_id)
        if active_of_nominator >= int(award["max_nominations_per_nominator"]):
            raise NominationDomainError("quota_exhausted",
                                        "you are at the per-nominator limit for this award")

        # scoped quotas (DEPT on nominee / COMPANY) seeded on award_quotas
        quotas = await self._repo.award_quotas_for(
            award["id"], period["id"], period["starts"], period["ends"])
        counted = _count_for_quota(existing)
        for q in quotas:
            before = counted.get((q["scope"], q["scope_value"]), 0)
            mine_new = 0 if any(str(r["id"]) != str(nomination_id) for r in existing) else 1
            total = before + mine_new
            if total > int(q["max_count"]):
                raise NominationDomainError("quota_exhausted",
                                            f"the {q['scope_value']} quota ({q['scope']})"
                                            " for this award is used up this quarter")

        await self._repo.route_nomination(nomination_id, actor_id)
        return {"routed_to": 1}

    async def _validate_core_values(self, core_values: list[str]) -> None:
        valid = set(await self._repo.core_value_keys())
        unknown = [v for v in core_values if v not in valid]
        if unknown:
            raise NominationDomainError("value_unknown", f"unknown core value(s): {', '.join(unknown)}")


def owner_story_values(owner: dict[str, Any]) -> list[str]:
    vals = owner.get("core_values")
    return list(vals) if vals else []


def _count_for_quota(rows: list[dict[str, Any]]) -> dict[tuple[str, str], int]:
    """Used counts per (scope, scope_value) among the period's active rows."""
    counts: dict[tuple[str, str], int] = {}
    for row in rows:
        if row.get("status") in ("draft", "returned", "not_selected"):
            continue  # drafts/returned/closed-out rows never consume a slot
        counts[("COMPANY", "COMPANY")] = counts.get(("COMPANY", "COMPANY"), 0) + 1
    return counts
