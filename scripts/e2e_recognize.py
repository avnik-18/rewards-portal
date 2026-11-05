"""End-to-end over the FastAPI surface: submit -> approve -> verify credit.

Run with the repo's venv after `alembic upgrade head` + `seed/demo.sql`:
    .venv/bin/python -m scripts.e2e_recognize

Identity: the X-Demo-User header (dev fallback mode) — the request body never
carries the actor, matching the production contract in the API.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Defaults match this repo's docker-compose (see .env.example); .env overrides.
os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402

CONTAINER = os.environ.get("PG_CONTAINER", "recog-api-db-1")
DB_NAME = os.environ.get("PG_DB", "recog")
DEMO_SEED = Path(__file__).resolve().parents[1] / "seed" / "demo.sql"

lookup: dict[str, str] = {}


def psql(query: str, params: dict[str, str] | None = None) -> str:
    """Run a one-shot psql query; `params` bind psql variables used
    with the :'name' literal-quoting syntax (never string-inline SQL)."""
    docker = shutil.which("docker")
    if docker is None:
        print("WARNING: docker CLI not found — results will be empty and the "
              "run cannot proceed", file=sys.stderr)
        return ""
    args = [docker, "exec", CONTAINER, "psql", "-U", "postgres", "-d", DB_NAME,
            "-Atqc", query]
    for name, value in (params or {}).items():
        args += ["-v", f"{name}={value}"]
    try:
        return subprocess.check_output(args).decode().strip()  # noqa: S603
    except Exception as exc:  # noqa: BLE001 — psql failures degrade to empty ids
        print(f"WARNING: psql failed ({exc}) — results will be empty and the "
              "run cannot proceed", file=sys.stderr)
        return ""


def load_ids() -> None:
    query = "SELECT id FROM users WHERE employee_code = :'code'"
    for code in ("E-PR", "E-RH", "E-L1"):
        lookup[code] = psql(query, {"code": code})


def wallet_balance(user_id: str) -> int:
    query = "SELECT COALESCE(balance,0) FROM points_wallet WHERE user_id = :'uid'"
    return int(psql(query, {"uid": user_id}) or 0)


def allowance_balance(user_id: str) -> int:
    query = "SELECT COALESCE(balance,0) FROM to_recog_points WHERE user_id = :'uid'"
    return int(psql(query, {"uid": user_id}) or 0)


def reset_allowances() -> None:
    # fresh wallets for a deterministic run (past e2e data persists by design)
    psql("UPDATE to_recog_points SET balance = allocated")


def check(condition: bool, message: str) -> None:
    """Standalone-script assertion the interpreter's -O can never strip."""
    if not condition:
        raise SystemExit(f"E2E FAIL: {message}")


def main() -> None:
    load_ids()
    if len({value for value in lookup.values() if value}) < 3:
        print("ERROR: demo users missing — apply the optional demo seed first:")
        print(f"  docker cp {DEMO_SEED} {CONTAINER}:/tmp/seed.sql && "
              f"docker exec {CONTAINER} psql -U postgres -d {DB_NAME} -f /tmp/seed.sql")
        raise SystemExit(1)

    # context-managed client: one event loop for the whole run (async engine reuse)
    with TestClient(create_app()) as client:
        giver = {"X-Demo-User": "E-PR"}
        approver = {"X-Demo-User": "E-L1"}

        # 1) auto-approved band: 40 pts from Priya to Rahul — credited exactly 40
        pre = wallet_balance(lookup["E-RH"])
        response = client.post(
            "/api/v1/recognitions",
            headers=giver,
            json={
                "to_user_ids": [lookup["E-RH"]],
                "points": 40,
                "message": "e2e: small kudos auto-approved",
            },
        )
        check(response.status_code == 200, response.text)
        check(response.json()["status"] == "approved", str(response.json()))
        post = wallet_balance(lookup["E-RH"])
        check(post == pre + 40, f"auto-approve must credit pre+40 (got {pre} -> {post})")
        print("40-pt auto-approve OK", response.json()["recognition_id"])

        # 2) routed band: 150 pts (L1 = Sam must approve) — credited exactly pre+150
        reset_allowances()
        pre = wallet_balance(lookup["E-RH"])
        response = client.post(
            "/api/v1/recognitions",
            headers=giver,
            json={
                "to_user_ids": [lookup["E-RH"]],
                "points": 150,
                "message": "e2e: routed band",
            },
        )
        check(response.status_code == 200, response.text)
        body = response.json()
        check(body["status"] == "pending_approval", str(body))
        item = body["approval_item_id"]
        print("150-pt routed OK", item)

        # 3) Sam approves -> Rahul credited exactly pre+150 (increment, not overwrite)
        response = client.post(
            f"/api/v1/recognitions/approval/{item}/decide",
            headers=approver,
            json={"approve": True},
        )
        check(response.status_code == 200, response.text)
        check(response.json()["status"] == "approved", response.text)
        post = wallet_balance(lookup["E-RH"])
        check(post == pre + 150, f"routed credit must be pre+150 (got {pre} -> {post})")
        print("approve OK — Rahul points_wallet balance:", post)

        # 4) decline without a note -> 422 (top up the wallet so the spend fits)
        reset_allowances()
        pre_allowance = allowance_balance(lookup["E-PR"])
        response = client.post(
            "/api/v1/recognitions",
            headers=giver,
            json={
                "to_user_ids": [lookup["E-RH"]],
                "points": 120,
                "message": "e2e: to be declined",
            },
        )
        item2 = response.json()["approval_item_id"]
        check(response.json()["status"] == "pending_approval", str(response.json()))
        check(allowance_balance(lookup["E-PR"]) == pre_allowance - 120,
              "hold must debit the allowance")
        response = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers=approver,
            json={"approve": False, "note": None},
        )
        check(response.status_code == 422, response.text)
        print("decline without a note -> 422 OK")

        response = client.post(
            f"/api/v1/recognitions/approval/{item2}/decide",
            headers=approver,
            json={"approve": False, "note": "not the right fit"},
        )
        check(response.status_code == 200, response.text)
        check(allowance_balance(lookup["E-PR"]) == pre_allowance,
              "declined points must be refunded exactly once")
        print("decline with note OK — allowance restored")

        print("ALL E2E RECOGNITION CHECKS PASS")


if __name__ == "__main__":
    main()
