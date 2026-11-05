"""Shared integration-test helpers — DATABASE_URL only, no Docker anywhere.

Connects the way the app connects: via DATABASE_URL. No container names,
no `docker exec`, no PG_CONTAINER/PG_DB env vars — the same connection
principle as production and the session dependency."""

import os
from pathlib import Path

from sqlalchemy import create_engine, text

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402

_TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", _TEST_DB)
DATABASE_URL = os.environ.get("DATABASE_URL", _TEST_DB)
_SYNC_URL = DATABASE_URL.replace("+asyncpg", "+psycopg2")
_SYNC_ENGINE = create_engine(_SYNC_URL)


def db_ready() -> bool:
    try:
        with _SYNC_ENGINE.connect() as c:
            c.execute(_sqltext("SELECT 1"))
        return True
    except Exception:
        return False


DB_READY = db_ready()


def psql(q: str) -> str:
    """Execute a SQL query and return the scalar (or string) result."""
    try:
        with _SYNC_ENGINE.connect() as c:
            result = c.execute(_sqltext(q))
            if result.returns_rows:
                row = result.fetchone()
                if row is not None and len(row) >= 1:
                    return str(row[0]) if row[0] is not None else ""
                return ""
            return ""
    except Exception as e:
        print(f"WARNING: psql query failed ({e!r})", file=sys.stderr)
        return ""


def psql_file(local_sql: str) -> None:
    """Execute a SQL file against the DB."""
    sql_text = Path(local_sql).read_text(encoding="utf-8")
    with _SYNC_ENGINE.connect() as c:
        c.execute(_sqltext(sql_text))
        c.commit()


def seed_demo_if_missing() -> None:
    count = int(psql("SELECT count(*) FROM users WHERE employee_code LIKE 'E-%'") or 0)
    if count < 7:
        demo = Path(__file__).resolve().parents[2] / "seed" / "demo.sql"
        psql_file(str(demo))


def set_allowances_to_allocated() -> None:
    psql("UPDATE to_recog_points SET balance = allocated")


def wallet_balance(user_id: str) -> int:
    raw = psql(f"SELECT COALESCE((SELECT balance FROM points_wallet WHERE user_id='{user_id}'), 0)")
    return int(raw) if raw else 0


def allow_balance(user_id: str) -> int:
    raw = psql(f"SELECT COALESCE((SELECT balance FROM to_recog_points WHERE user_id='{user_id}'), 0)")
    return int(raw) if raw else 0


def employee_code_id(code: str) -> str:
    return psql(f"SELECT id FROM users WHERE employee_code='{code}'")
