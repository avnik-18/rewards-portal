"""Async SQLAlchemy engine + session dependency. Models land with the first migration."""

import asyncio
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

# The engine is bound to the event loop that created it. In production that's
# a single loop for the process' lifetime; under pytest each TestClient spins
# its own loop, so a naively cached engine trips 'Event loop is closed' on the
# second test file. Tracking the owning loop makes engine reuse loop-safe
# (rebuilds only when the loop changes — never in production).
_ENGINE: AsyncEngine | None = None
_ENGINE_LOOP_ID: int | None = None
_SESSION_FACTORY: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _ENGINE, _ENGINE_LOOP_ID
    loop_id = id(asyncio.get_running_loop())
    if _ENGINE is None or _ENGINE_LOOP_ID != loop_id:
        _ENGINE = create_async_engine(get_settings().database_url, pool_pre_ping=True)
        _ENGINE_LOOP_ID = loop_id
    return _ENGINE


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _SESSION_FACTORY, _ENGINE_LOOP_ID
    loop_id = id(asyncio.get_running_loop())
    if _SESSION_FACTORY is None or _ENGINE_LOOP_ID != loop_id:
        _SESSION_FACTORY = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _SESSION_FACTORY


async def get_session() -> AsyncIterator[AsyncSession]:
    """Unit-of-work per request: the dependency owns the transaction.

    Commit once when the handler completes successfully; roll back (and
    re-raise) on ANY failure — including exceptions converted to responses by
    downstream handlers. Repositories therefore never commit or roll back;
    future multiple writes (outbox, audit, notification) land in the same
    unit of work (reviewer transaction-ownership comment)."""
    async with get_session_factory()() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
