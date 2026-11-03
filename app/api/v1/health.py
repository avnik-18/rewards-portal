"""Liveness/readiness inside the versioned prefix."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str]:
    return {
        "status": "ok",
        "environment": str(settings.environment or "unset"),
        "version": settings.version,
    }
