"""End-to-end over the FastAPI surface: submit -> approve -> verify credit.

Run with the repo's venv after `alembic upgrade head` + `seed/demo.sql`:
    .venv/bin/python -m scripts.e2e_recognize

Identity: the X-Demo-User header (dev fallback mode) — the request body never
carries the actor, matching the production contract in the API.
"""

import os
from pathlib import Path
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Defaults match this repo's docker-compose (see .env.example); .env overrides.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402

lookup: dict[str, str] = {}

CONTAINER = os.environ.get("PG_CONTAINER", "recog-api-db-1")
DB_NAME = os.environ.get("PG_DB", "recog")
DEMO_SEED = Path(__file__).resolve().parents[1] / "seed" / "demo.sql"


def psql(q: str) -> str:
    try:
        return (
            subprocess.check_output(
                ["docker", "exec", CONTAINER, "psql", "-U", "postgres", "-d", DB_NAME, "-Atqc", q]
            )
            .decode()
            .strip()
        )
    except Exception as e:
        print(f"WARNING: psql failed ({e}) — results will be empty and the run cannot proceed",
              file=sys.stderr)
        return ""


def load_ids() -> None:
    for code in ("E-PR", "E-RH", "E-L1"):
        lookup[code] = psql(f"SELECT id FROM users WHERE employee_code='{code}'")


def main() -> None:
    load_ids()
    if len({v for v in lookup.values() if v}) < 3:
        print("ERROR: demo users missing — apply the optional demo seed first:")
        print(f"  docker cp {DEMO_SEED} {CONTAINER}:/tmp/seed.sql && "
              f"docker exec {CONTAINER} psql -U postgres -d {DB_NAME} -f /tmp/seed.sql")
        raise SystemExit(1)

    # fresh wallets for a deterministic run (past e2e data persists by design)
    psql("UPDATE to_recog_points SET balance = allocated")

    # context-managed client: one event loop for the whole run (async engine reuse)
    with TestClient(create_app()) as client:
        giver = {"X-Demo-User": "E-PR"}
        approver = {"X-Demo-User": "E-L1"}

        # 1) auto-approved band: 40 pts from Priya to Rahul — credited exactly 40
        pre = int(psql(f"SELECT COALESCE(balance,0) FROM points_wallet WHERE user_id='{lookup['E-RH']}'") or 0)
        r = client.post(
            "/api/v1/recognitions",
            headers=giver,
            json={
                "to_user_ids": [lookup["E-RH"]],
                "points": 40,
                "message": "e2e: small kudos auto-approved",
            },
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved", r.json()
        post = int(psql(f"SELECT COALESCE(balance,0) FROM points_wallet WHERE user_id='{lookup['E-RH']}'") or 0)
        assert post == pre + 40, f"auto-approve must credit pre+40 (got {pre} -> {post})"
        print("40-pt auto-approve OK", r.json()["recognition_id"])

        # 2) routed band: 150 pts (L1 = Sam must approve) — credited exactly pre+150
        _psql_reset = psql("UPDATE to_recog_points SET balance = allocated")
        pre = int(psql(f"SELECT COALESCE(balance,0) FROM points_wallet WHERE user_id='{lookup['E-RH']}'") or 0)
        r = client.post(
            "/api/v1/recognitions",
            headers=giver,
            json={
                "to_user_ids": [lookup["E-RH"]],
                "points": 150,
                "message": "e2e: routed band",
            },
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending_approval", body
        item = body["approval_item_id"]
        print("150-pt routed OK", item)

        # 3) Sam approves -> Rahul credited exactly pre+150 (increment, not overwrite)
        r = client.post(
            f"/api/v1/recognitions/approval/{item}/decide",
            headers=approver,
            json={"approve": True},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "approved", r.text
        post = int(psql(f"SELECT COALESCE(balance,0) FROM points_wallet WHERE user_id='{lookup['E-RH']}'") or 0)
        assert post == pre + 150, f"routed credit must be pre+150 (got {pre} -> {post})"
        print("approve OK — Rahul points_wallet balance:", post)

        # 4) decline without a note -> 422 (top up the wallet so the spend fits)
        psql("UPDATE to_recog_points SET balance = allocated")
        pre_allowance = int(psql(f"SELECT COALESCE(balance,0) FROM to_recog_points WHERE user_id='{lookup['E-PR']}'") or 0)
        r = client.post(
            "/api/v1/recognitions",
            headers=giver,
            json={
                "to_user_ids": [lookup["E-RH"]],
                "points": 120,
                "message": "e2e: to be declined",
            },
        )
        item2 = r.json()["approval_item_id"]
        assert r.json()["status"] == "pending_approval"
        assert int(psql(f"SELECT COALESCE(balance,0) FROM to_recog_points WHERE user_id='{lookup['E-PR']}'") or 0) == pre_allowance - 120, "hold must debit the allowance"
        r = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers=approver,
            json={"approve": False, "note": None},
        )
        assert r.status_code == 422, r.text
        print("decline without a note -> 422 OK")

        with_note = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers=approver,
            json={"approve": False, "note": "not the right fit"},
        )
        assert with_note.status_code == 200, with_note.text
        assert int(psql(f"SELECT COALESCE(balance,0) FROM to_recog_points WHERE user_id='{lookup['E-PR']}'") or 0) == pre_allowance, "declined points must be refunded exactly once"
        print("decline with note OK — allowance restored")

        print("ALL E2E RECOGNITION CHECKS PASS")


if __name__ == "__main__":
    main()
