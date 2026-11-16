"""DTOs for the demo-identity dropdown listing."""

from pydantic import BaseModel


class DemoUserItem(BaseModel):
    employee_code: str
    full_name: str
    title: str | None = None
    department: str | None = None
