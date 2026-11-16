"""DTOs for /me and /me/stats — shapes the next.js Home screen consumes."""

from uuid import UUID

from pydantic import BaseModel


class MeProfileResponse(BaseModel):
    id: UUID
    employee_code: str
    full_name: str
    email: str | None = None
    role: str = "individual"
    title: str | None = None
    department: str | None = None


class MeStatsResponse(BaseModel):
    points_balance: int
    allowance_left: int | None = None
    allowance_allocated: int | None = None
    recognitions_given: int
    recognitions_received: int
