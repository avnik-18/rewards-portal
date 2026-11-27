"""Repository for the /nominations award-nomination flow — SQL only.

Adapted from the team's feature/myteam-nominations branch: same endpoint
contract, but the approval chain is OUR lane (review_stage on
awards_nominations via fn_nomination_decide / fn_nomination_admin_decide)
— no approval_item rows are created here. The detail trail the UI draws
is synthesized from the nomination row's own state.

Field adapters between the team's compose contract and our schema:
- their achievements (one text blob) ↔ our achievements JSONB list — one
  bullet per non-empty line, so the DH/admin dossiers render lists;
- their support_doc_url (one link) ↔ our supporting_docs JSONB
  ([{label, url}]) — the first doc row carries the compose URL.
"""

from __future__ import annotations

import json
from typing import Any, cast
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

_TEXT = sa.text


def row_dict(row: Any) -> dict[str, Any]:
    return dict(row._mapping)


def _ach_to_jsonb(value: str | None) -> str:
    if not value or not value.strip():
        return "[]"
    return json.dumps([ln.strip() for ln in value.split("\n") if ln.strip()])


def _parse_jsonb(value: Any) -> Any:
    """asyncpg hands JSONB back as a str through raw SQL; unwrap defensively."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return None
    return value


def _ach_from_jsonb(value: Any) -> str | None:
    return "\n".join(v for v in (_parse_jsonb(value) or []) if v) or None


def _docs_to_jsonb(docs: list[dict[str, str]] | None) -> str:
    if not docs:
        return "[]"
    rows = [{"label": (d.get("label") or "Supporting document").strip() or "Supporting document",
             "url": str(d.get("url", "")).strip()}
            for d in docs if str(d.get("url", "") or "").strip()]
    return json.dumps(rows)


def _doc_url_to_jsonb(url: str | None) -> str:
    if not url or not url.strip():
        return "[]"
    return json.dumps([{"label": "Supporting document", "url": url.strip()}])


def _docs_from_jsonb(docs: Any) -> list[dict[str, str]]:
    return [{"label": str(d.get("label") or "Supporting document"),
             "url": str(d["url"])}
            for d in (_parse_jsonb(docs) or [])
            if d and d.get("url")]


def _doc_url_from_jsonb(docs: Any) -> str | None:
    for d in _parse_jsonb(docs) or []:
        if d and d.get("url"):
            return str(d["url"])
    return None


def _with_view_styles(n: dict[str, Any]) -> dict[str, Any]:
    n["achievements"] = _ach_from_jsonb(n.get("achievements"))
    n["support_doc_url"] = _doc_url_from_jsonb(n.get("supporting_docs"))
    n["supporting_docs"] = _docs_from_jsonb(n.get("supporting_docs"))
    return n


_PSEUDO_DH = "00000000-0000-0000-0000-000000000000"

_NOM_COLS = """
    n.id, n.nomination_ref, n.award_id, a.name AS award_name, a.prize_points,
    n.status::text AS status, n.team_id, t.name AS team_name,
    n.nominator_id, nu.full_name AS nominator_name,
    n.nominee_id, n.is_self_nomination,
    nn.full_name AS nominee_name, nn.title AS nominee_title,
    nn.department AS nominee_department,
    (n.nominator_id = :viewer) AS is_nominator,
    n.story, n.core_values, n.achievements, n.supporting_docs,
    n.review_stage::text AS review_stage, n.decision_note,
    n.decided_by, du.full_name AS decider_name, n.decided_at,
    n.created_at
"""

# fused query constants — the column list is written out in full (no string
# concatenation); the only interpolation points are the named binds.
_DETAIL_SQL = """
    SELECT
        n.id, n.nomination_ref, n.award_id, a.name AS award_name, a.prize_points,
        n.status::text AS status, n.team_id, t.name AS team_name,
        n.nominator_id, nu.full_name AS nominator_name,
        n.nominee_id, n.is_self_nomination,
        nn.full_name AS nominee_name, nn.title AS nominee_title,
        nn.department AS nominee_department,
        (n.nominator_id = :viewer) AS is_nominator,
        n.story, n.core_values, n.achievements, n.supporting_docs,
        n.review_stage::text AS review_stage, n.decision_note,
        n.decided_by, du.full_name AS decider_name, n.decided_at,
        n.created_at
      FROM awards_nominations n
      JOIN awards a ON a.id = n.award_id
      JOIN users nu ON nu.id = n.nominator_id
      LEFT JOIN teams t ON t.id = n.team_id
      LEFT JOIN users du ON du.id = n.decided_by
      LEFT JOIN users nn ON nn.id = n.nominee_id
     WHERE n.id = :nid
"""

_LIST_SQL_MINE = """
    SELECT
        n.id, n.nomination_ref, n.award_id, a.name AS award_name, a.prize_points,
        n.status::text AS status, n.team_id, t.name AS team_name,
        n.nominator_id, nu.full_name AS nominator_name,
        n.nominee_id, n.is_self_nomination,
        nn.full_name AS nominee_name, nn.title AS nominee_title,
        nn.department AS nominee_department,
        (n.nominator_id = :viewer) AS is_nominator,
        n.story, n.core_values, n.achievements, n.supporting_docs,
        n.review_stage::text AS review_stage, n.decision_note,
        n.decided_by, du.full_name AS decider_name, n.decided_at,
        n.created_at
      FROM awards_nominations n
      JOIN awards a ON a.id = n.award_id
      JOIN users nu ON nu.id = n.nominator_id
      LEFT JOIN teams t ON t.id = n.team_id
      LEFT JOIN users du ON du.id = n.decided_by
      LEFT JOIN users nn ON nn.id = n.nominee_id
     WHERE n.nominator_id = :viewer OR n.nominee_id = :viewer
     ORDER BY n.created_at DESC
"""

_LIST_SQL_MANAGE = """
    SELECT
        n.id, n.nomination_ref, n.award_id, a.name AS award_name, a.prize_points,
        n.status::text AS status, n.team_id, t.name AS team_name,
        n.nominator_id, nu.full_name AS nominator_name,
        n.nominee_id, n.is_self_nomination,
        nn.full_name AS nominee_name, nn.title AS nominee_title,
        nn.department AS nominee_department,
        (n.nominator_id = :viewer) AS is_nominator,
        n.story, n.core_values, n.achievements, n.supporting_docs,
        n.review_stage::text AS review_stage, n.decision_note,
        n.decided_by, du.full_name AS decider_name, n.decided_at,
        n.created_at
      FROM awards_nominations n
      JOIN awards a ON a.id = n.award_id
      JOIN users nu ON nu.id = n.nominator_id
      LEFT JOIN teams t ON t.id = n.team_id
      LEFT JOIN users du ON du.id = n.decided_by
      LEFT JOIN users nn ON nn.id = n.nominee_id
     ORDER BY n.created_at DESC
"""

class NominationsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ------------------------------------------------------------------ reads

    async def current_period(self) -> dict[str, Any] | None:
        res = await self._session.execute(_TEXT(
            "SELECT id, name, starts, ends FROM fiscal_period"
            " WHERE now()::date BETWEEN starts AND ends ORDER BY starts LIMIT 1"))
        r = res.first()
        return row_dict(r) if r else None

    async def open_awards(self, actor_id: UUID) -> list[dict[str, Any]]:
        # same gating our portal tiles use: phase 'nominations' inside the
        # nomination window (NULL bounds = always open), inside a live period
        res = await self._session.execute(_TEXT(
            """
            SELECT a.id AS award_id, a.name, a.description, a.prize_points,
                   a.max_nominations_per_nominator, a.nominations_end,
                   a.eligibility, a.period_id AS period_id,
                   p.starts AS period_starts, p.ends AS period_ends,
                   (SELECT count(*) FROM awards_nominations xn
                     WHERE xn.award_id = a.id
                       AND xn.nominator_id = :actor
                       AND xn.status NOT IN ('draft', 'returned', 'not_selected')
                       AND p.starts <= xn.created_at AND xn.created_at < p.ends
                   ) AS used_by_nominator
              FROM awards a
              JOIN fiscal_period p ON p.id = a.period_id
             WHERE a.phase = 'nominations'
               AND (a.nominations_start IS NULL OR a.nominations_start <= now()::date)
               AND (a.nominations_end IS NULL OR a.nominations_end >= now()::date)
               AND now()::date BETWEEN p.starts AND p.ends
             ORDER BY a.name
            """),
            dict(actor=str(actor_id)))
        awards = [row_dict(r) for r in res.all()]
        if not awards:
            return []
        for a in awards:
            a["quotas"] = await self.award_quotas_for(
                a["award_id"], a.get("period_id"), a.get("period_starts"), a.get("period_ends"))
        return awards

    async def award_quotas_for(
        self, award_id: UUID, period_id: Any, period_starts: Any, period_ends: Any,
    ) -> list[dict[str, Any]]:
        if period_id is None or period_starts is None or period_ends is None:
            return []
        res = await self._session.execute(_TEXT(
            """
            SELECT q.scope, q.scope_value, q.max_count,
                   (SELECT count(*) FROM awards_nominations un
                      LEFT JOIN users udu ON udu.id = un.nominee_id
                     WHERE un.award_id = q.award_id
                       AND un.status NOT IN ('draft', 'returned', 'not_selected')
                       AND un.created_at >= :ps AND un.created_at < :pe
                       AND (q.scope = 'COMPANY'
                            OR (q.scope = 'DEPT' AND udu.department = q.scope_value))
                   ) AS used
              FROM award_quotas q
             WHERE q.award_id = :aid AND q.period_id = :pid
             ORDER BY q.scope, q.scope_value
            """),
            dict(aid=str(award_id), pid=str(period_id), ps=period_starts, pe=period_ends))
        return [row_dict(r) for r in res.all()]

    async def award_by_id(self, award_id: UUID, period_id: UUID) -> dict[str, Any] | None:
        res = await self._session.execute(_TEXT(
            "SELECT a.*, p.starts AS period_starts, p.ends AS period_ends"
            " FROM awards a JOIN fiscal_period p ON p.id = a.period_id"
            " WHERE a.id = :aid AND p.id = :pid"),
            dict(aid=str(award_id), pid=str(period_id)))
        r = res.first()
        return row_dict(r) if r else None

    async def nomination_owner(self, nomination_id: UUID) -> dict[str, Any] | None:
        res = await self._session.execute(_TEXT(
            "SELECT id, nominator_id, status::text AS status, award_id, nominee_id,"
            " team_id, review_stage::text AS review_stage, core_values"
            " FROM awards_nominations WHERE id = :nid"),
            dict(nid=str(nomination_id)))
        r = res.first()
        return row_dict(r) if r else None

    async def team_members_for(self, team_id: UUID) -> list[dict[str, Any]]:
        res = await self._session.execute(_TEXT(
            "SELECT tm.user_id, tm.role FROM team_members tm"
            " WHERE tm.team_id = :tid AND tm.valid_to IS NULL"
            " ORDER BY tm.role LIMIT 200"),
            dict(tid=str(team_id)))
        return [row_dict(r) for r in res.all()]

    async def teams_with_size(self, viewer_id: UUID) -> list[dict[str, Any]]:
        """The team picker (scoped, 0036): admin sees every team; a leader
        sees only the teams they OWN as DM — the picker feeds nominations,
        and only the lane's DM may nominate. dm_id rides out as lead_id
        (the record-level nominee role)."""
        res = await self._session.execute(_TEXT(
            """
            SELECT t.id, t.name, t.project_name,
                   count(tm.id) FILTER (WHERE tm.valid_to IS NULL) AS member_count,
                   t.dm_id AS lead_id
              FROM teams t
              LEFT JOIN team_members tm ON tm.team_id = t.id
             WHERE fn_persona(:viewer) = 'admin' OR t.dm_id = :viewer
             GROUP BY t.id, t.name, t.project_name, t.dm_id
             ORDER BY t.name
            """),
            dict(viewer=str(viewer_id)))
        return [row_dict(r) for r in res.all()]

    async def nominee_choices(self, viewer_id: UUID) -> list[dict[str, Any]]:
        """The nominee picker (scoped, 0036): admin sees the whole active
        directory; a leader sees the members of the teams they own as DM —
        plus themself (allow_self awards stay possible for the lane's DM)."""
        res = await self._session.execute(_TEXT(
            """
            SELECT u.id, u.full_name, u.title, u.department
              FROM users u
             WHERE (fn_persona(:viewer) = 'admin' AND u.employment_status <> 'separated')
                OR EXISTS (
                  SELECT 1 FROM teams t
                  JOIN team_members tm ON tm.team_id = t.id AND tm.valid_to IS NULL
                 WHERE t.dm_id = :viewer AND tm.user_id = u.id)
                OR u.id = :viewer
             ORDER BY u.full_name
            """),
            dict(viewer=str(viewer_id)))
        return [row_dict(r) for r in res.all()]

    async def core_value_keys(self) -> list[str]:
        res = await self._session.execute(_TEXT("SELECT key FROM emids_values"))
        return [str(r[0]) for r in res.all()]

    async def persona_of(self, user_id: UUID) -> str:
        res = await self._session.execute(_TEXT(
            "SELECT fn_persona(:uid)::text AS persona"), dict(uid=str(user_id)))
        return str(row_dict(res.one())["persona"])

    async def is_admin_or_leader(self, user_id: UUID) -> bool:
        return (await self.persona_of(user_id)) in ("leader", "admin")

    async def user_row(self, user_id: UUID) -> dict[str, Any] | None:
        res = await self._session.execute(_TEXT(
            "SELECT id, full_name, title, department, grade, joined_on"
            " FROM users WHERE id = :uid"),
            dict(uid=str(user_id)))
        r = res.first()
        return row_dict(r) if r else None

    async def team_lane(self, user_id: UUID, team_id: UUID | None) -> dict[str, Any] | None:
        """The leadership lane a nomination rides: for a team nomination the
        named team, otherwise the user's current team (membership first, the
        team they own as DM/DH as the fallback — owners belong to their
        team's lane without a member row). Returns the row's dm_id (who may
        nominate) and dh_id (whose queue it lands in), or None when the
        subject carries no lane."""
        if team_id is not None:
            res = await self._session.execute(_TEXT(
                "SELECT id AS team_id, name AS team_name, dm_id, dh_id"
                " FROM teams WHERE id = :tid"),
                dict(tid=str(team_id)))
        else:
            res = await self._session.execute(_TEXT(
                "SELECT t.id AS team_id, t.name AS team_name, t.dm_id, t.dh_id"
                " FROM teams t"
                " JOIN team_members tm ON tm.team_id = t.id AND tm.valid_to IS NULL"
                " WHERE tm.user_id = :uid"
                " ORDER BY t.name LIMIT 1"),
                dict(uid=str(user_id)))
            r = res.first()
            if not r:
                res = await self._session.execute(_TEXT(
                    "SELECT id AS team_id, name AS team_name, dm_id, dh_id"
                    " FROM teams WHERE dm_id = :uid OR dh_id = :uid"
                    " ORDER BY name LIMIT 1"),
                    dict(uid=str(user_id)))
                r = res.first()
        return row_dict(r) if r else None

    async def count_nominator_active(self, award_id: UUID, nominator_id: UUID) -> int:
        res = await self._session.execute(_TEXT(
            "SELECT count(*) FROM awards_nominations n"
            " WHERE n.award_id = :aid AND n.nominator_id = :nid"
            " AND n.status NOT IN ('draft', 'returned', 'not_selected')"),
            dict(aid=str(award_id), nid=str(nominator_id)))
        return int(res.scalar() or 0)

    async def nomination_refs_for(
        self, award_id: UUID, period_starts: Any, period_ends: Any,
    ) -> list[dict[str, Any]]:
        res = await self._session.execute(_TEXT(
            "SELECT n.id, n.nominee_id, n.team_id, n.status::text AS status"
            " FROM awards_nominations n"
            " WHERE n.award_id = :aid AND n.created_at >= :ps AND n.created_at < :pe"),
            dict(aid=str(award_id), ps=period_starts, pe=period_ends))
        return [row_dict(r) for r in res.all()]

    async def lock_submit(self, award_id: UUID) -> None:
        await self._session.execute(_TEXT(
            "SELECT pg_advisory_xact_lock(hashtext('award-submit:' || :aid))"),
            dict(aid=str(award_id)))

    # --------------------------------------------------------------- writes

    async def create_draft(
        self, actor_id: UUID, award_id: UUID, nominee_id: UUID, team_id: UUID | None,
        story: str, core_values: list[str], achievements: str | None,
        supporting_docs: list[dict[str, str]] | None) -> dict[str, Any]:
        res = await self._session.execute(_TEXT(
            """
            INSERT INTO awards_nominations
                (award_id, nominee_id, nominator_id, story, is_self_nomination,
                 status, core_values, achievements, supporting_docs)
            VALUES (:award, :nominee, :actor, :story, :self_nom, 'draft',
                    CAST(:cvals AS jsonb), CAST(:ach AS jsonb), CAST(:docs AS jsonb))
            RETURNING id
            """),
            dict(award=str(award_id), nominee=str(nominee_id), actor=str(actor_id),
                 story=story, self_nom=bool(nominee_id and nominee_id == actor_id),
                 cvals=json.dumps(core_values or []),
                 ach=_ach_to_jsonb(achievements), docs=_docs_to_jsonb(supporting_docs)))
        return {"id": str((res.one())[0]), "status": "draft"}

    async def update_draft(
        self, nomination_id: UUID, actor_id: UUID, story: str,
        core_values: list[str], achievements: str | None,
        supporting_docs: list[dict[str, str]] | None,
        nominee_id: UUID | None, team_id: UUID | None) -> bool:
        res = await self._session.execute(_TEXT(
            """
            UPDATE awards_nominations
               SET story = :story,
                   core_values = CAST(:cvals AS jsonb),
                   achievements = CAST(:ach AS jsonb),
                   supporting_docs = CAST(:docs AS jsonb),
                   nominee_id = :nominee,
                   team_id = :team
             WHERE id = :nid AND nominator_id = :actor
               AND status IN ('draft', 'returned')
            RETURNING id
            """),
            dict(nid=str(nomination_id), actor=str(actor_id), story=story,
                 cvals=json.dumps(core_values or []),
                 ach=_ach_to_jsonb(achievements), docs=_docs_to_jsonb(supporting_docs),
                 nominee=str(nominee_id) if nominee_id else None,
                 team=str(team_id) if team_id else None))
        return int(cast(Any, res).rowcount or 0) > 0

    async def clear_returned_notes(self, nomination_id: UUID) -> None:
        await self._session.execute(_TEXT(
            "UPDATE awards_nominations SET decision_note = NULL WHERE id = :nid"),
            dict(nid=str(nomination_id)))

    async def delete_draft(self, nomination_id: UUID, actor_id: UUID) -> bool:
        res = await self._session.execute(_TEXT(
            "DELETE FROM awards_nominations"
            " WHERE id = :nid AND nominator_id = :actor AND status = 'draft'"),
            dict(nid=str(nomination_id), actor=str(actor_id)))
        return int(cast(Any, res).rowcount or 0) > 0

    async def release_award(self, award_id: UUID) -> bool:
        res = await self._session.execute(_TEXT(
            "UPDATE awards SET phase = 'nominations'"
            " WHERE id = :aid AND phase = 'draft'"),
            dict(aid=str(award_id)))
        return int(cast(Any, res).rowcount or 0) > 0

    async def route_nomination(self, nomination_id: UUID, actor_id: UUID) -> None:
        """Our lane's routing: the draft row becomes a submitted nomination
        watched by the DH queue (review_stage 'dh')."""
        await self._session.execute(_TEXT(
            """
            UPDATE awards_nominations
               SET status = 'submitted', review_stage = 'dh'
             WHERE id = :nid AND nominator_id = :actor
               AND status IN ('draft', 'returned')
            """),
            dict(nid=str(nomination_id), actor=str(actor_id)))

    # ---------------------------------------------------------------- detail

    async def nomination_detail(self, nomination_id: UUID, viewer_id: UUID) -> dict[str, Any] | None:
        res = await self._session.execute(_TEXT(_DETAIL_SQL),
            dict(nid=str(nomination_id), viewer=str(viewer_id)))
        r = res.first()
        if not r:
            return None
        n = _with_view_styles(row_dict(r))
        n["approval_history"] = await self.approval_history(nomination_id)
        n["can_edit"] = n.get("is_nominator") is True and n["status"] in ("draft", "returned")
        return n

    async def my_nominations(self, viewer_id: UUID, scope: str) -> list[dict[str, Any]]:
        """mine: the viewer is the nominator OR the nominee; manage: the
        leaders/admins list — every nomination."""
        res = await self._session.execute(_TEXT(_LIST_SQL_MINE if scope != "manage" else _LIST_SQL_MANAGE),
            dict(viewer=str(viewer_id)))
        return [_with_view_styles(row_dict(r)) for r in res.all()]

    async def approval_history(self, nomination_id: UUID) -> list[dict[str, Any]]:
        """Our lane's trail synthesized from the nomination row's own state —
        same row shape their detail page draws (entry.seq/level/owner/…)."""
        res = await self._session.execute(_TEXT(
            "SELECT status::text AS status, review_stage::text AS review_stage,"
            " decision_note, decided_by, decided_at,"
            " du.full_name AS decider_name"
            " FROM awards_nominations n"
            " LEFT JOIN users du ON du.id = n.decided_by"
            " WHERE n.id = :nid"),
            dict(nid=str(nomination_id)))
        r = res.first()
        if not r:
            return []
        return _synth_steps(row_dict(r))


def _synth_steps(n: dict[str, Any]) -> list[dict[str, Any]]:
    """The history rows the detail page draws, from our lane's state."""
    status = n.get("status") or ""
    stage = n.get("review_stage") or ""
    decider = n.get("decider_name")
    decider_id = n.get("decided_by") or _PSEUDO_DH
    decided_at = n.get("decided_at")
    disc_note = n.get("decision_note") or None
    entries: list[dict[str, Any]] = []
    if status == "submitted" and stage == "dh":
        entries.append({
            "seq": 1, "level": "dh", "owner_id": _PSEUDO_DH,
            "owner_name": "Department head", "status": "pending",
            "note": None, "decided_at": None,
        })
    elif status == "endorsed":
        entries.append({
            "seq": 1, "level": "dh", "owner_id": decider_id,
            "owner_name": decider or "Department head",
            "status": "approved", "note": None, "decided_at": decided_at,
        })
        entries.append({
            "seq": 2, "level": "admin", "owner_id": _PSEUDO_DH,
            "owner_name": "Program admin", "status": "pending",
            "note": None, "decided_at": None,
        })
    elif status == "result":
        entries.append({
            "seq": 1, "level": "dh",
            "owner_id": _PSEUDO_DH, "owner_name": "Department head",
            "status": "approved", "note": None, "decided_at": None,
        })
        entries.append({
            "seq": 2, "level": "admin", "owner_id": decider_id,
            "owner_name": decider or "Program admin",
            "status": "approved", "note": None, "decided_at": decided_at,
        })
    elif status == "not_selected":
        entries.append({
            "seq": 1, "level": "decision", "owner_id": decider_id,
            "owner_name": decider or "Reviewer",
            "status": "declined", "note": disc_note,
            "decided_at": decided_at,
        })
    elif status == "returned":
        entries.append({
            "seq": 1, "level": "dh", "owner_id": decider_id,
            "owner_name": decider or "Department head",
            "status": "returned", "note": disc_note,
            "decided_at": decided_at,
        })
    return entries

