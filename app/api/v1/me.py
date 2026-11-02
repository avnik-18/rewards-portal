"""Who am I — proves the SSO dependency is wired into routes the UI will call."""

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.auth import CurrentUser

router = APIRouter(tags=["me"])


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    return user
