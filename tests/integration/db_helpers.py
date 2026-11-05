"""Shared integration-test helpers — connects via DATABASE_URL directly.

No Docker exec, no container names, no shell scripts — just a sync SQLAlchemy
connection to the same Postgres the app uses. Portable to local compose,
CI service containers, staging, or cloud DB."""

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

_DATABASE_URL_RAW = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
)
_SYNC_URL = _DATABASE_URL_RAW.replace("+asyncpg", "+psycopg2")
_SYNC_ENGINE = create_engine(_SYNC_URL)


def db_ready() -> bool:
    try:
        with _SYNC_ENGINE.connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


DB_READY = db_ready()


def db_exec(q: str) -> str:
    """Execute a SQL statement and return the string result of the first column."""
    try:
        with _SYNC_ENGINE.connect() as c:
            result = c.execute(text(q))
            c.commit()
            if result.returns_rows:
                row = result.fetchone()
                if row is not None and len(row) >= 1 and row[0] is not None:
                    return str(row[0])
            return ""
    except Exception as e:
        print(f"WARNING: db_exec failed: {e!r}", file=sys.stderr)
        return ""


def db_exec_file(sql_file_path: str) -> None:
    """Read a .sql file from disk and execute it against the DB."""
    sql_text = Path(sql_file_path).read_text(encoding="utf-8")
    with _SYNC_ENGINE.connect() as c:
        # raw driver execution: text() would capture ':1' inside literals
        # like '{"min":1}' as a bind parameter (CI: "A value is required for
        # bind parameter '1'") — a .sql file must be passed through verbatim.
        c.exec_driver_sql(sql_text)
        c.commit()


def seed_demo_if_missing() -> None:
    """Apply seed/demo.sql when demo users are missing."""
    count = int(db_exec("SELECT count(*) FROM users WHERE employee_code LIKE 'E-%'") or 0)
    if count < 7:
        demo_seed = str(Path(__file__).resolve().parents[2] / "seed" / "demo.sql")
        db_exec_file(str(demo_seed))


def reset_allowances() -> None:
    db_exec("UPDATE to_recog_points SET balance = allocated")


def wallet_balance(user_id: str) -> int:
    raw = db_exec(
        "SELECT COALESCE((SELECT balance FROM points_wallet "
        f"WHERE user_id='{user_id}'), 0)"
    )
    return int(raw) if raw else 0


def allowance_balance(user_id: str) -> int:
    raw = db_exec(
        "SELECT COALESCE((SELECT balance FROM to_recog_points "
        f"WHERE user_id='{user_id}'), 0)"
    )
    return int(raw) if raw else 0


def employee_id_by_code(code: str) -> str:
    return db_exec(f"SELECT id FROM users WHERE employee_code='{code}'")
