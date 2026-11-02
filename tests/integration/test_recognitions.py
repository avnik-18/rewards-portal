"""Recognitions API over the live DB — skipped unless DATABASE_URL points at an
alembic-applause schema with (optionally) seed/demo.sql applied.

Environment (all overridable):
  DATABASE_URL  the alembic-built DB (default: the compose-recog demo URL)
  PG_CONTAINER  the docker container serving that DB (docker-compose default: recog-api-db-1)
  PG_DB         its database name (recog)

The actor identity is sent via the X-Demo-User header (dev fallback mode) —
the request body NEVER carries it (see app/api/v1/recognitions.py).

Structural checks per repo convention (not seed-value sniffing):
1. auto-approve band credits the recipient by exactly the submitted points
2. routed band returns pending_approval + an item id; approve transitions to
   approved and credits THE SAME recipient by exactly the routed amount
3. decline without a note is rejected (422); with a note the item closes
   declined and the giver's allowance is restored
"""

import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:applause_dev@127.0.0.1:5433/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)
DATABASE_URL = os.environ.get("DATABASE_URL", TEST_DB)
CONTAINER = os.environ.get("PG_CONTAINER", "applause-pg")
PG_DB = os.environ.get("PG_DB", "recog")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


def _db_ready() -> bool:
    """Probe the ACTUAL configured DATABASE_URL (never a hardcoded fallback)."""
    try:
        from sqlalchemy import create_engine, text  # noqa: E402

        engine = create_engine(DATABASE_URL.replace("+asyncpg", "+psycopg2"))
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


DB_READY = _db_ready()


def _psql_file(local_sql: str) -> None:
    """Apply a local SQL file to the DB (docker cp + psql -f)."""
    name = Path(local_sql).name
    subprocess.check_call(["docker", "cp", local_sql, f"{CONTAINER}:/tmp/{name}"])
    subprocess.check_call(["docker", "exec", CONTAINER, "psql", "-U", "postgres",
                           "-d", PG_DB, "-f", f"/tmp/{name}"])


def _psql(q: str) -> str:
    """Query via docker exec; container + db from env (PG_CONTAINER / PG_DB)."""
    try:
        return (
            subprocess.check_output(
                ["docker", "exec", CONTAINER, "psql", "-U", "postgres",
                 "-d", PG_DB, "-Atqc", q]
            ).decode().strip()
        )
    except Exception as e:
        # NOT silent: a failed probe here means the environment is wrong
        # (container down / db name mismatch) — surface it loudly rather
        # than letting empty strings masquerade as zero balances.
        print(f"WARNING: _psql probe failed ({e!r}) — check PG_CONTAINER={CONTAINER!r} / PG_DB={PG_DB!r}",
              file=sys.stderr)
        return ""


def _seed_demo_if_missing() -> None:
    """Apply seed/demo.sql when demo users are missing (fresh alembic DB)."""
    import math  # noqa: F401
    count = int(_psql("SELECT count(*) FROM users WHERE employee_code LIKE 'E-%'") or 0)
    if count < 7:
        demo_seed = Path(__file__).resolve().parents[2] / "seed" / "demo.sql"
        _psql_file(str(demo_seed))


# the optional demo seed lives in seed/demo.sql (canonical pointer for tooling)
def _wallet(user_id: str) -> int:
    """points_wallet balance — 0 when the wallet row doesn't exist yet
    (fresh seed creates allowance rows; wallets appear on first receipt)."""
    raw = _psql(f"SELECT COALESCE((SELECT balance FROM points_wallet WHERE user_id='{user_id}'), 0)")
    return int(raw) if raw else 0


def _allowance(user_id: str) -> int:
    """to_recog_points balance — 0 when the allowance row doesn't exist yet."""
    raw = _psql(f"SELECT COALESCE((SELECT balance FROM to_recog_points WHERE user_id='{user_id}'), 0)")
    return int(raw) if raw else 0


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_recognition_flow() -> None:
    _seed_demo_if_missing()
    ids = {c: _psql(f"SELECT id FROM users WHERE employee_code='{c}'")
           for c in ("E-PR", "E-RH", "E-BR", "E-L1")}
    giver, recipient = ids["E-PR"], ids["E-RH"]
    routed_receipt = ids["E-BR"]

    # one lifestyled client: a single event loop across requests (async engine reuse)
    with TestClient(create_app()) as client:
        # deterministic wallet state — the spends below fit regardless of suite order
        _psql("UPDATE to_recog_points SET balance = allocated")

        # 1) auto-approve band (≤100): credits the recipient by exactly 40
        pre = _wallet(recipient)
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [recipient],
                "points": 40,
                "message": "t: auto band",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "approved" and body["approval_item_id"] is None
        post = _wallet(recipient)
        assert post == pre + 40, f"auto-approve must credit +40 (got {pre} -> {post})"

        # 2) routed band (101–200): SAME-recipient increment of exactly 150 —
        #    regression guard for the increment-vs-overwrite bug class
        _psql("UPDATE to_recog_points SET balance = allocated")
        pre = _wallet(recipient)
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [recipient],
                "points": 150,
                "message": "t: routed band",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending_approval" and body["approval_item_id"]
        item = body["approval_item_id"]

        # 2b) the approve decision: allowance funds release to the recipient
        #     (identity = the X-Demo-User header, never the body)
        r = client.post(
            f"/api/v1/recognitions/approval/{item}/decide",
            headers={"X-Demo-User": "E-L1"},
            json={"approve": True},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved"
        post = _wallet(recipient)
        assert post == pre + 150, f"routed credit must be pre+150 (got {pre} -> {post})"

        # 3) decline: no note -> 422; with note the item closes declined
        #    and the giver's allowance is restored (refund exactly once)
        _psql("UPDATE to_recog_points SET balance = allocated")
        pre_allowance = _allowance(giver)
        r = client.post(
            "/api/v1/recognitions",
            headers={"X-Demo-User": "E-PR"},
            json={
                "to_user_ids": [routed_receipt],
                "points": 120,
                "message": "t: decline test",
            },
        )
        assert r.status_code == 200, r.text
        item2 = r.json()["approval_item_id"]
        pre_allowance_after_spend = _allowance(giver)
        assert pre_allowance_after_spend == pre_allowance - 120, "hold must debit the allowance"

        r = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers={"X-Demo-User": "E-L1"},
            json={"approve": False, "note": None},
        )
        assert r.status_code == 422, r.text

        r = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers={"X-Demo-User": "E-L1"},
            json={"approve": False, "note": "wrong fit"},
        )
        assert r.status_code == 200 and r.json()["status"] == "declined"
        assert _allowance(giver) == pre_allowance, "declined points must be refunded exactly once"
