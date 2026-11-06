"""Liveness + DB readiness inside the versioned prefix.

/health is the readiness probe: it opens a real connection (SELECT 1) and
returns 503 when the database is unreachable. Service topology (environment)
is NOT reported to unauthenticated callers (reviewer comment)."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="database unreachable",
        ) from None
    return {"status": "ok"}
