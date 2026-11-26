"""Repository for the admin awards slice — SQL only, never HTTP errors.

Calls the fn_* functions of alembic/versions/0027_awards_cycle_content.py
and 0029_award_cycle_admin.py:
  fn_admin_list_cycles(actor)
  fn_admin_create_cycle(actor, name, starts, ends,
                        nominations_close, voting_close, results_on)
  fn_admin_set_cycle_timeline(actor, period, nominations_close,
                              voting_close, results_on)
  fn_admin_upsert_award(period, award, name, value, prize_points, nom_end,
                        vot_end, requires_jury, actor, max_nominations,
                        cadence, description, photo_url, guidelines)
  fn_admin_set_award_phase(award, phase, actor)
  fn_admin_upsert_cycle_content(period, headline, tagline, cta_label, cta_url, actor)
  fn_awards_tile()
  fn_awards_cycles_for_user(actor)      — leader-facing read (Work Item #3)
  fn_submit_nomination(award, nominee, nominator, story, achievements, docs)
  fn_nomination_decide(nomination, decider, approve, note) — DH lane (0031)
  fn_nomination_admin_decide(nomination, decider, approve, note) — admin lane (0034)
Every fn_* rule (persona gate, audit, phase lock, nomination limit) lives
IN the DB (ADR 0001). DB failures propagate as raised — the service layer
translates them (recognition_service._error_code contract)."""

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def _decode_jsonb(value: Any) -> Any:
    """asyncpg delivers jsonb as raw text unless a session codec is installed —
    decode defensively so the fn result is always Python data."""
    if isinstance(value, str):
        return json.loads(value)
    return value


class AdminAwardsRepository:
    """Admin-awards repo pattern methods: SQL only, no HTTPException."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_cycles(self, actor_id: UUID) -> list[dict[str, Any]]:
        result = await self._session.execute(
            text("SELECT fn_admin_list_cycles(:actor)"),
            dict(actor=str(actor_id)),
        )
        return list(_decode_jsonb(result.scalar_one()))

    async def upsert_award(
        self,
        actor_id: UUID,
        period_id: UUID,
        award_id: UUID | None,
        name: str,
        value_id: UUID | None,
        prize_points: int,
        nominations_end: Any,
        nominations_start: Any,
        requires_jury: bool,
        max_nominations: int = 1,
        cadence: str = "quarterly",
        description: str | None = None,
        photo_url: str | None = None,
        guidelines: list[dict[str, Any]] | None = None,
        approval_start: Any = None,
        approval_end: Any = None,
    ) -> UUID:
        result = await self._session.execute(
            text(
                "SELECT fn_admin_upsert_award("
                ":p_period, :p_award, :p_name, :p_value_id, :p_prize_points, "
                ":p_nominations_end, :p_nominations_start, :p_requires_jury, :p_actor, "
                ":p_max_nominations, :p_cadence, :p_description, :p_photo_url, "
                "CAST(:p_guidelines AS jsonb), :p_approval_start, :p_approval_end) AS id"
            ),
            dict(
                p_period=str(period_id),
                p_award=str(award_id) if award_id else None,
                p_name=name,
                p_value_id=str(value_id) if value_id else None,
                p_prize_points=prize_points,
                p_nominations_end=nominations_end,
                p_nominations_start=nominations_start,
                p_requires_jury=requires_jury,
                p_actor=str(actor_id),
                p_max_nominations=max_nominations,
                p_cadence=cadence,
                p_description=description,
                p_photo_url=photo_url,
                # asyncpg cannot encode a Python list into the CASTed jsonb
                # parameter — serialize to the JSON text the cast consumes
                p_guidelines=json.dumps(guidelines) if guidelines is not None else None,
                p_approval_start=approval_start,
                p_approval_end=approval_end,
            ),
        )
        return UUID(str(result.scalar_one()))

    async def create_cycle(
        self,
        actor_id: UUID,
        name: str,
        starts: Any,
        ends: Any,
        nominations_close: Any,
        results_on: Any,
    ) -> UUID:
        result = await self._session.execute(
            text(
                "SELECT fn_admin_create_cycle("
                ":p_actor, :p_name, :p_start_date, :p_end_date, "
                ":p_nominations_close, :p_results_on) AS id"
            ),
            dict(
                p_actor=str(actor_id),
                p_name=name,
                p_start_date=starts,
                p_end_date=ends,
                p_nominations_close=nominations_close,
                p_results_on=results_on,
            ),
        )
        return UUID(str(result.scalar_one()))

    async def set_cycle_timeline(
        self,
        actor_id: UUID,
        period_id: UUID,
        nominations_close: Any,
        results_on: Any,
    ) -> None:
        await self._session.execute(
            text(
                "SELECT fn_admin_set_cycle_timeline("
                ":p_actor, :p_period, :p_nominations_close, :p_results_on)"
            ),
            dict(
                p_actor=str(actor_id),
                p_period=str(period_id),
                p_nominations_close=nominations_close,
                p_results_on=results_on,
            ),
        )

    async def cycles_for_user(self, actor_id: UUID) -> list[dict[str, Any]]:
        result = await self._session.execute(
            text("SELECT fn_awards_cycles_for_user(:actor)"),
            dict(actor=str(actor_id)),
        )
        return list(_decode_jsonb(result.scalar_one()))

    async def submit_nomination(
        self,
        award_id: UUID,
        nominee_id: UUID,
        nominator_id: UUID,
        story: str,
        achievements: list[str] | None = None,
        supporting_docs: list[dict[str, Any]] | None = None,
    ) -> UUID:
        result = await self._session.execute(
            text(
                "SELECT fn_submit_nomination("
                ":p_award, :p_nominee, :p_nominator, :p_story, "
                "CAST(:p_achievements AS jsonb), CAST(:p_docs AS jsonb)) AS id"
            ),
            dict(
                p_award=str(award_id),
                p_nominee=str(nominee_id),
                p_nominator=str(nominator_id),
                p_story=story,
                p_achievements=json.dumps(achievements or []),
                p_docs=json.dumps(supporting_docs or []),
            ),
        )
        return UUID(str(result.scalar_one()))

    # the lane scope (0036): admins see the whole stage; a leader sees only
    # the nominations routed to THEIR teams' dh_id — a nominee counts for a
    # team when they are a current member OR the team's dm/dh owner (owner
    # nominee falls back to their own team's lane); the viewer passes as the
    # :viewer bind
    _LANE_PREDICATE = """
        (fn_persona(:viewer) = 'admin' OR EXISTS (
          SELECT 1 FROM teams l
          LEFT JOIN team_members ltm ON ltm.team_id = l.id AND ltm.valid_to IS NULL
         WHERE l.dh_id = :viewer
           AND (n.team_id = l.id
                OR (n.team_id IS NULL
                    AND (ltm.user_id = n.nominee_id
                         OR l.dm_id = n.nominee_id
                         OR l.dh_id = n.nominee_id)))))
    """

    async def approvals_pending(self, viewer_id: UUID) -> dict[str, list[dict[str, Any]]]:
        """The DH review lane (0031): award categories carrying stage='dh'
        nominations + those nominations, SCOPED — a leader sees only the
        lanes their teams own (0036), an admin sees everything. Straight
        table reads (rules live in fn_submit_nomination; nothing here needs
        a fn's locking)."""
        lane = self._LANE_PREDICATE
        # the lane breathes with the award's approval window (0032): inside
        # [approval_start, approval_end] — or NULL window — both queries
        # return award rows; outside it the DH neither sees nor acts
        awards = await self._session.execute(
            text(
                "SELECT a.id, a.name, a.description AS description, "
                "a.nominations_end::text AS due_date, a.cadence::text AS cadence, "
                "a.approval_start::text AS approval_start, "
                "a.approval_end::text AS approval_end "
                "FROM awards a "
                "JOIN awards_nominations n ON n.award_id = a.id "
                "WHERE n.review_stage = 'dh' AND a.phase <> 'cancelled' "
                "AND (a.approval_start IS NULL OR a.approval_start <= CURRENT_DATE)"
                " AND (a.approval_end IS NULL OR a.approval_end >= CURRENT_DATE) "
                "AND " + lane + " "
                "GROUP BY a.id ORDER BY a.nominations_end NULLS LAST"
            ),
            dict(viewer=str(viewer_id))
        )
        nominations = await self._session.execute(
            text(
                "SELECT n.id, n.award_id, "
                "nr.employee_code AS nominee_code, nr.full_name AS nominee_name, "
                "nr.title AS nominee_title, "
                "mr.full_name AS nominator_name, mr.title AS nominator_title, "
                "n.story AS why, n.achievements, n.supporting_docs AS docs, "
                "n.created_at AS submitted_at "
                "FROM awards_nominations n "
                "JOIN awards a ON a.id = n.award_id "
                "JOIN users nr ON nr.id = n.nominee_id "
                "JOIN users mr ON mr.id = n.nominator_id "
                "WHERE n.review_stage = 'dh' AND a.phase <> 'cancelled' "
                "AND (a.approval_start IS NULL OR a.approval_start <= CURRENT_DATE)"
                " AND (a.approval_end IS NULL OR a.approval_end >= CURRENT_DATE) "
                "AND " + lane + " "
                "ORDER BY n.created_at DESC"
            ),
            dict(viewer=str(viewer_id))
        )
        return {"awards": _decode_jsonb(awards.mappings().all()),
                "nominations": _decode_jsonb(nominations.mappings().all())}

    async def decide_nomination(
        self, nomination_id: UUID, decider_id: UUID, approve: bool, note: str | None
    ) -> None:
        await self._session.execute(
            text(
                "SELECT fn_nomination_decide("
                ":p_nomination, :p_decider, :p_approve, :p_note)"
            ),
            dict(
                p_nomination=str(nomination_id),
                p_decider=str(decider_id),
                p_approve=approve,
                p_note=note,
            ),
        )

    async def approvals_admin_pending(self) -> dict[str, list[dict[str, Any]]]:
        """The admin final lane (0034): awards carrying review_stage='admin'
        nominations + those nominations with the DM (who nominated) and the
        DH (who endorsed it, decided_by/decided_at) resolved. Plain reads —
        the verdict rules live in fn_nomination_admin_decide."""
        awards = await self._session.execute(
            text(
                "SELECT a.id, a.name, a.description AS description, "
                "a.nominations_end::text AS due_date, a.cadence::text AS cadence, "
                "a.approval_start::text AS approval_start, "
                "a.approval_end::text AS approval_end, "
                "a.prize_points "
                "FROM awards a "
                "JOIN awards_nominations n ON n.award_id = a.id "
                "WHERE n.review_stage = 'admin' AND a.phase <> 'cancelled' "
                "GROUP BY a.id ORDER BY a.nominations_end NULLS LAST"
            )
        )
        nominations = await self._session.execute(
            text(
                "SELECT n.id, n.award_id, "
                "nr.employee_code AS nominee_code, nr.full_name AS nominee_name, "
                "nr.title AS nominee_title, "
                "mr.full_name AS nominator_name, mr.title AS nominator_title, "
                "dh.full_name AS dh_decided_by, dh.title AS dh_decided_title, "
                "n.decided_by, n.decided_at AS dh_decided_at, "
                "n.story AS why, n.achievements, n.supporting_docs AS docs, "
                "n.created_at AS submitted_at "
                "FROM awards_nominations n "
                "JOIN awards a ON a.id = n.award_id "
                "JOIN users nr ON nr.id = n.nominee_id "
                "JOIN users mr ON mr.id = n.nominator_id "
                "JOIN users dh ON dh.id = n.decided_by "
                "WHERE n.review_stage = 'admin' AND a.phase <> 'cancelled' "
                "ORDER BY n.decided_at DESC"
            )
        )
        return {"awards": _decode_jsonb(awards.mappings().all()),
                "nominations": _decode_jsonb(nominations.mappings().all())}

    async def decide_admin_nomination(
        self, nomination_id: UUID, decider_id: UUID, approve: bool, note: str | None
    ) -> None:
        await self._session.execute(
            text(
                "SELECT fn_nomination_admin_decide("
                ":p_nomination, :p_decider, :p_approve, :p_note)"
            ),
            dict(
                p_nomination=str(nomination_id),
                p_decider=str(decider_id),
                p_approve=approve,
                p_note=note,
            ),
        )

    async def set_award_phase(self, actor_id: UUID, award_id: UUID, phase: str) -> None:
        await self._session.execute(
            text("SELECT fn_admin_set_award_phase(:p_award, :p_phase, :p_actor)"),
            dict(p_award=str(award_id), p_phase=phase, p_actor=str(actor_id)),
        )

    async def delete_award(self, actor_id: UUID, award_id: UUID) -> None:
        """Cancelled-only cleanup — the grace rules live in the fn."""
        await self._session.execute(
            text("SELECT fn_admin_delete_award(:p_award, :p_actor)"),
            dict(p_award=str(award_id), p_actor=str(actor_id)),
        )

    async def upsert_cycle_content(
        self,
        actor_id: UUID,
        period_id: UUID,
        headline: str,
        tagline: str | None,
        cta_label: str | None,
        cta_url: str | None,
    ) -> None:
        await self._session.execute(
            text(
                "SELECT fn_admin_upsert_cycle_content("
                ":p_period, :p_headline, :p_tagline, :p_cta_label, :p_cta_url, :p_actor)"
            ),
            dict(
                p_period=str(period_id),
                p_headline=headline,
                p_tagline=tagline,
                p_cta_label=cta_label,
                p_cta_url=cta_url,
                p_actor=str(actor_id),
            ),
        )

    async def awards_tile(self) -> dict[str, Any]:
        result = await self._session.execute(text("SELECT fn_awards_tile()"))
        return dict(_decode_jsonb(result.scalar_one()))
