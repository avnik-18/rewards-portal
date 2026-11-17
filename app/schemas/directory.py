"""Directory DTOs — GET /people (the who-can-I-recognize list).

One row per recognition-eligible colleague (actor excluded, guests excluded);
manager identity fields are flattened onto the same object via self-join.
"""

from uuid import UUID

from pydantic import BaseModel


class PersonRowResponse(BaseModel):
    """One recognizable person, plus their manager for chain previews."""

    id: UUID
    employee_code: str
    full_name: str
    email: str
    title: str | None = None
    department: str | None = None
    manager_id: UUID | None = None
    manager_code: str | None = None
    manager_name: str | None = None
