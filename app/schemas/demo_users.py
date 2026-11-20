"""DTOs for the demo-identity dropdown listing."""

from pydantic import BaseModel


class DemoUserItem(BaseModel):
    employee_code: str
    full_name: str
    title: str | None = None
    department: str | None = None
    # role + persona let the login screen group the dropdown by hier_mods:
    # Admins, then Leaders, then the employee pool — the same mapping /me
    # resolves for the picked identity (fn_persona mirrors it).
    role: str = "individual"
    persona: str = "employee"
