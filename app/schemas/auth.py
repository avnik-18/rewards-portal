"""Auth DTOs shared across every router via the get_current_user dependency."""

from pydantic import BaseModel


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    role: str = "employee"
