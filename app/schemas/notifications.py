"""Notifications DTOs — bell badge (deliverable #6)."""

from pydantic import BaseModel


class UnreadCountResponse(BaseModel):
    """Rows in the notification table still missing their read_at stamp."""

    unread_count: int
