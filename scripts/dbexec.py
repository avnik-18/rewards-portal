"""psql replacement for the verify gate — the script layer talks to Postgres
through DATABASE_URL (the same knob as the app and the migrations), never
through `docker exec`. A lead review: Docker/compose is only what RUNS the
dev Postgres; anything that READS it goes over the connection string, so the
verify scripts work unchanged against local compose, a CI service container,
or a cloud database.

Output mirrors `psql -At`: one line per row, columns joined with '|', NULL
renders empty. Accepts (and ignores where behavior is already default) the
psql flags the verify suites pass: -A -t -q -c, -f FILE, -v NAME=VAL.
The SQL text comes from the first non-option argument, or stdin when there
is none (`run_sql -v ON_ERROR_STOP=1 < file.sql` still works).

Exit codes: 0 happy; 1 with "ERROR: <detail>" on stderr for any driver or
SQL failure (ON_ERROR_STOP semantics: the caller's `|| { ...exit 1; }` chains
stay true to what they expect)."""

import os
import sys
from typing import Any

import psycopg2

_ALLOWED_FLAGS = "Atqcf"


def _sync_url() -> str:
    raw = os.environ.get("DATABASE_URL", "")
    if not raw:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    application_schemes = ("+psycopg2", "+asyncpg", "+psycopg")
    for scheme in application_schemes:
        raw = raw.replace("postgresql" + scheme + "://", "postgresql://", 1)
        raw = raw.replace("postgres" + scheme + "://", "postgresql://", 1)
    return raw


def _render(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "t" if value else "f"
    if isinstance(value, (bytes, bytearray)):
        return bytes(value).decode("utf-8", "replace")
    return str(value)


def main() -> None:
    args = sys.argv[1:]
    sql = None
    index = 0
    while index < len(args):
        arg = args[index]
        if arg == "-f":
            if index + 1 >= len(args):
                print("ERROR: -f needs a file argument", file=sys.stderr)
                sys.exit(1)
            with open(args[index + 1], encoding="utf-8") as handle:
                sql = handle.read()
            index += 2
            continue
        if arg == "-v" and index + 1 < len(args):
            index += 2  # var assignments have no effect; stopping on error is always on
            continue
        if arg.startswith("-") and arg[1:] and all(ch in _ALLOWED_FLAGS for ch in arg[1:]):
            index += 1
            continue
        break
    if index < len(args):
        sql = args[index]
    if sql is None:
        sql = sys.stdin.read()

    try:
        conn = psycopg2.connect(_sync_url(), connect_timeout=10)
    except psycopg2.Error as exc:
        print(f"ERROR: cannot connect to DATABASE_URL: {exc!r}", file=sys.stderr)
        sys.exit(1)
    try:
        with conn, conn.cursor() as cursor:
            cursor.execute(sql)
            rows = list(cursor.fetchall()) if cursor.description else []
    except psycopg2.Error as exc:
        detail = ""
        if exc.diag is not None:
            detail = exc.diag.message_primary or ""
        if not detail:
            detail = ";".join(str(part) for part in exc.args) or repr(exc)
        print(f"ERROR: {detail}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()

    out = sys.stdout
    for row in rows:
        out.write("|".join(_render(col) for col in row) + "\n")


if __name__ == "__main__":
    main()
