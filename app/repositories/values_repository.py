"""Reads for /values — the recognition values catalog with nested templates.

SQL only, no business rules, no HTTP errors.

Ordering is deterministic and documented here: values come back ordered by
``emids_values.key`` (stable catalog/dictionary order), templates ordered by
``recognition_templates.name`` within each value. One LEFT JOIN query brings
the active values plus their active templates; the nested list is assembled
in Python (plain dicts) so a value with no active templates still appears
with an empty ``templates`` list — that is the expected shape, not an error.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_ACTIVE_VALUES_QUERY = text(
    "SELECT v.id AS value_id, v.key AS value_key, v.label AS value_label, "
    "t.id AS template_id, t.name AS template_name, "
    "t.emoji AS template_emoji, t.art_json AS template_art_json, "
    "t.prefill AS template_prefill "
    "FROM emids_values v "
    "LEFT JOIN recognition_templates t "
    "ON t.value_id = v.id AND t.is_active "
    "WHERE v.is_active "
    "ORDER BY v.key, t.name"
)


class ValuesRepository:
    """One method per read; returns rows/dicts for the service layer."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def active_values_with_templates(self) -> list[dict[str, Any]]:
        """Active values, each with a nested list of its active templates.

        Template rows carry ``art_urls`` extracted in Python from the
        template's ``art_json`` jsonb: only when the jsonb holds a mapping
        whose ``urls`` member is itself a JSON array; anything else (missing,
        non-array, non-mapping art_json) yields an empty list.
        """
        result = await self._session.execute(_ACTIVE_VALUES_QUERY)
        rows: list[dict[str, Any]] = [dict(row) for row in result.mappings().all()]
        grouped: dict[Any, dict[str, Any]] = {}
        for row in rows:
            value_id = row["value_id"]
            value = grouped.get(value_id)
            if value is None:
                value = {
                    "id": value_id,
                    "key": row["value_key"],
                    "label": row["value_label"],
                    "templates": [],
                }
                grouped[value_id] = value
            template_id = row["template_id"]
            if template_id is None:
                continue  # LEFT JOIN miss: value has no active templates.
            art_json = row["template_art_json"]
            raw_urls = art_json.get("urls") if isinstance(art_json, dict) else None
            art_urls = [url for url in raw_urls if isinstance(url, str)] if isinstance(raw_urls, list) else []
            value["templates"].append(
                {
                    "id": template_id,
                    "name": row["template_name"],
                    "emoji": row["template_emoji"],
                    "art_urls": art_urls,
                    "prefill": row["template_prefill"],
                }
            )
        return list(grouped.values())
