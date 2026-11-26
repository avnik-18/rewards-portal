"""Reads for /celebrations — upcoming birthdays and work anniversaries.

SQL only, like the other read repositories. The relevant-people filter mirrors
the feed's relationship shapes: the viewer's manager chain (ancestors), teams
they lead, teammates they share an open team with, and their department —
while an admin (fn_persona) sees the whole org, since the org has no
"relevant people" from the top. Self is never listed. Each event's milestone
date is the next occurrence of birth_date / joined_on.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

# Next occurrence of a monthly-annual date, this year or next (the LEAST keeps
# Feb-29-type bases inside the candidate month). Spawned per base column.
_CANDIDATE = """
CROSS JOIN LATERAL (
    SELECT EXTRACT(YEAR FROM CURRENT_DATE)::int AS cy,
           EXTRACT(MONTH FROM {base})::int AS mm
) cal{tag}
CROSS JOIN LATERAL (
    SELECT ((make_date(cal{tag}.cy, cal{tag}.mm, 1) + interval '1 month')::date - 1) AS month_end
) gc{tag}
CROSS JOIN LATERAL (
    SELECT make_date(cal{tag}.cy, cal{tag}.mm,
                     LEAST(EXTRACT(DAY FROM {base})::int,
                           EXTRACT(DAY FROM gc{tag}.month_end)::int))::date AS this_year
) cand{tag}
CROSS JOIN LATERAL (
    SELECT CASE WHEN cand{tag}.this_year >= CURRENT_DATE
                THEN cand{tag}.this_year
                ELSE (cand{tag}.this_year + interval '1 year')::date END AS event_at
) nxt{tag}
"""

# Interpolation only splices the static _CANDIDATE constant; all runtime
# values ride bound parameters (:actor, :window_days) — hence the noqa.
# Interpolation only splices the static _CANDIDATE constant; every runtime
# value rides a bound parameter (:actor, :window_days).
_SQL = text(
    f"""
    WITH RECURSIVE chain AS (
        SELECT u.manager_id AS ancestor_id FROM users u WHERE u.id = :actor
        UNION ALL
        SELECT u.manager_id FROM users u JOIN chain c ON u.id = c.ancestor_id
        WHERE c.ancestor_id IS NOT NULL
    ),
    led_teams AS (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.user_id = :actor AND tm.valid_to IS NULL AND tm.role = 'lead'
    ),
    team_roster AS (
        SELECT DISTINCT tm2.user_id FROM team_members tm1
        JOIN team_members tm2 ON tm2.team_id = tm1.team_id AND tm2.valid_to IS NULL
        WHERE tm1.user_id = :actor AND tm1.valid_to IS NULL
    ),
    viewer_dept AS (
        SELECT department FROM users WHERE id = :actor
    ),
    relevant AS (
        SELECT id FROM users
        WHERE (SELECT fn_persona(:actor) = 'admin')
           OR (id <> :actor AND (
                id IN (SELECT ancestor_id FROM chain WHERE ancestor_id IS NOT NULL)
             OR manager_id = :actor
             OR id IN (SELECT user_id FROM team_roster)
             OR id IN (SELECT tm.user_id FROM team_members tm
                       WHERE tm.valid_to IS NULL
                         AND tm.team_id IN (SELECT team_id FROM led_teams))
             OR (department = (SELECT department FROM viewer_dept))
            ))
    ),
    people AS (
        SELECT u.employee_code, u.full_name, u.birth_date, u.joined_on
        FROM relevant r JOIN users u ON u.id = r.id
    ),
    birthday AS (
        SELECT s.employee_code, s.full_name, 'birthday'::text AS kind,
               nxtB.event_at, (nxtB.event_at - CURRENT_DATE) AS days_until,
               NULL::text AS detail
        FROM people s
        {_CANDIDATE.format(base="s.birth_date", tag="B")}
        WHERE s.birth_date IS NOT NULL
    ),
    anniversary AS (
        SELECT s.employee_code, s.full_name, 'anniversary'::text AS kind,
               nxtA.event_at, (nxtA.event_at - CURRENT_DATE) AS days_until,
               NULL::text AS detail
        FROM people s
        {_CANDIDATE.format(base="s.joined_on", tag="A")}
        WHERE s.joined_on IS NOT NULL
    )
    -- PERSONAL milestones ONLY: birthdays + work anniversaries. The admin-posted
    -- org events (festivals / town halls) are retired from this read; the
    -- admin_event table stays for whatever the next content lane needs.
    SELECT employee_code, full_name, kind, event_at, days_until, detail
    FROM (
        SELECT employee_code, full_name, kind, event_at, days_until, detail FROM birthday
        UNION ALL
        SELECT employee_code, full_name, kind, event_at, days_until, detail FROM anniversary
    ) ev
    WHERE ev.days_until >= 0 AND ev.days_until <= :window_days
    ORDER BY ev.days_until, ev.full_name
    """  # noqa: S608 — the f-string splices static SQL only, params stay bound
)


class CelebrationsRepository:
    """One read: upcoming milestones for the actor's relevant people."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upcoming(self, actor_id: Any, window_days: int) -> list[dict[str, Any]]:
        result = await self._session.execute(
            _SQL,
            dict(actor=actor_id, window_days=window_days),
        )
        return [dict(row) for row in result.mappings().all()]
