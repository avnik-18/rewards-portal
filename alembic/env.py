"""Alembic migration environment.

Reads DATABASE_URL from app settings (.env). Migrations run on a SYNC psycopg2
engine (the schema is DB-owned SQL; no ORM autogenerate) — the app's async
asyncpg URL is switched to postgresql+psycopg2 for the migration run only.
Autogenerate stays OFF (target_metadata=None) permanently: the schema comes
from alembic/versions/*.py, never from model diffs.
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.config import get_settings

config = context.config

_sync_url = get_settings().database_url
if not _sync_url:
    # fail-fast with a readable message — settings.database_url defaults to ""
    # (the identity start-up guard lives on the API lane, not here)
    raise SystemExit("DATABASE_URL required — copy .env.example to .env or export it")
_sync_url = _sync_url.replace("+asyncpg", "+psycopg2", 1)
_sync_url = _sync_url.replace("postgresql://", "postgresql+psycopg2://", 1)
_sync_url = _sync_url.replace("postgres://", "postgresql+psycopg2://", 1)
config.set_main_option("sqlalchemy.url", _sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Schema is owned by alembic/versions/*.py — autogenerate stays disabled even
# if app/models/ Base appears later (see docs/db/design-source/README.md).
target_metadata = None


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _run_sync_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def _run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(_run_sync_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    if "+asyncpg" in config.get_main_option("sqlalchemy.url"):
        asyncio.run(_run_async_migrations())
    else:
        connectable = engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
        with connectable.connect() as connection:
            _run_sync_migrations(connection)
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
