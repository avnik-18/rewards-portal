"""GET /auth/demo-users — the login screen's demo-identity dropdown.

LOCAL environments ONLY: any non-local boot answers plain 404 (the route
cannot be probed in a deployed environment; the fail-closed boot preflight in
app.core.security remains the stronger guarantee there). Deliberately NOT
attached to get_actor_id — you need this endpoint to pick an actor, so
demanding one to list candidates is a chicken-and-egg trap.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.repositories.demo_users_repository import DemoUsersRepository
from app.schemas.demo_users import DemoUserItem
from app.services.demo_users_service import DemoUsersService

router = APIRouter(tags=["auth"])


def _service(session: Annotated[AsyncSession, Depends(get_session)]) -> DemoUsersService:
    return DemoUsersService(DemoUsersRepository(session))


@router.get("/auth/demo-users", response_model=list[DemoUserItem])
async def demo_users(
    service: Annotated[DemoUsersService, Depends(_service)],
) -> list[DemoUserItem]:
    if get_settings().environment != "local":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "not_found")
    return [DemoUserItem(**row) for row in await service.list()]
