"""Demo DTOs — the naming convention for all future request/response schemas."""

from pydantic import BaseModel


class DemoResponse(BaseModel):
    name: str
    message: str
