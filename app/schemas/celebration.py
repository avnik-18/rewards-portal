"""DTOs for /celebrations — the upcoming-events rail lines."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class CelebrationResponse(BaseModel):
    # event rows are org-wide (admin-posted), so they carry no person code —
    # title rides in full_name and detail holds the description.
    employee_code: str | None = None
    full_name: str
    kind: Literal["birthday", "anniversary", "event"]
    event_at: date
    days_until: int = Field(ge=0)
    detail: str | None = None
