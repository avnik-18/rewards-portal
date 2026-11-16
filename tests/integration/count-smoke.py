"""Real-HTTP smoke for /api/v1/recognitions/count — what TestClient cannot do.

Boots the actual app under uvicorn (factory mode), then exercises:
1. shape + auth gates over REAL sockets (200 / 400 missing header / 404
   unknown demo user)
2. TRUE parallel submissions: three simultaneous POSTs (separate
   connections, pooled threads) must each land, and the count must move by
   EXACTLY the number of accepted sends — no loss, no double-count under
   contention.
3. stability: one more read equals the same total (refresh idempotence).

Exit code 0 only if everything holds.

Run: .venv/bin/python tests/integration/count-smoke.py
"""

import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)
os.environ.setdefault("ENVIRONMENT", "local")

import httpx  # noqa: E402
import sqlalchemy as sa  # noqa: E402
import uvicorn  # noqa: E402

from app.main import create_app  # noqa: E402

HOST, PORT = "127.0.0.1", 8877
BASE = f"http://{HOST}:{PORT}/api/v1"
GIVER = "E-PR"

def _recipients() -> list[str]:
    """The first three eligible internal staff ≠ the giver (the seed's demo
    codes are not stable across branches — resolve from the DB)."""
    eng = sa.create_engine(TEST_DB.replace("+asyncpg", "+psycopg2"))
    with eng.connect() as conn:
        rows = conn.execute(sa.text(
            "SELECT employee_code FROM users u"
            " WHERE employee_code <> :giver AND source = 'internal'"
            "   AND COALESCE(recognition_eligible, employment_status = 'active')"
            " ORDER BY employee_code LIMIT 3"), {"giver": GIVER}).fetchall()
    return [r[0] for r in rows]


def main() -> int:
    server = uvicorn.Server(uvicorn.Config(
        create_app(), host=HOST, port=PORT, log_level="error"))
    t = threading.Thread(target=server.run, daemon=True)
    t.start()
    deadline = time.time() + 20
    while time.time() < deadline and not server.started:
        time.sleep(0.2)
    if not server.started:
        print("FAIL: uvicorn never started")
        return 1

    ok = True

    def check(name: str, condition: bool, detail: str = "") -> None:
        nonlocal ok
        print(("PASS" if condition else "FAIL"), name, detail)
        if not condition:
            ok = False

    with httpx.Client(base_url=BASE, timeout=30) as c:
        # 1) shape over a real socket
        r = c.get("/recognitions/count", headers={"X-Demo-User": GIVER})
        check("shape", r.status_code == 200
              and set(r.json().keys()) == {"total"}
              and isinstance(r.json()["total"], int))

        # 2) auth gates over real sockets
        check("400-no-header", c.get("/recognitions/count").status_code == 400)
        check("404-unknown-user",
              c.get("/recognitions/count",
                    headers={"X-Demo-User": "NOBODY"}).status_code == 404)

        # 3) TRUE parallel submissions: three simultaneous posts, three
        #    separate client connections
        before = c.get(
            "/recognitions/count", headers={"X-Demo-User": GIVER}).json()["total"]

        eng = sa.create_engine(TEST_DB.replace("+asyncpg", "+psycopg2"))
        codes = _recipients()
        with eng.connect() as conn:
            posts = []
            for code in codes:
                rid = str(conn.execute(
                    sa.text("SELECT id FROM users WHERE employee_code = :c"),
                    {"c": code}).scalar())
                posts.append({"to_user_ids": [rid], "points": 5,
                              "message": "count smoke parallel fixture"})

        def post(payload: dict) -> int:
            with httpx.Client(base_url=BASE, timeout=30) as c3:
                return c3.post("/recognitions",
                               headers={"X-Demo-User": GIVER},
                               json=payload).status_code

        with ThreadPoolExecutor(max_workers=len(posts)) as pool:
            results = list(pool.map(post, posts))
        check("parallel-all-200", results == [200] * len(posts), str(results))
        after = c.get(
            "/recognitions/count", headers={"X-Demo-User": GIVER}).json()["total"]
        check("count-moved-exactly", after == before + len(posts),
              f"{before} -> {after}")

        # 4) refresh stability: another read equals the same total
        r = c.get("/recognitions/count", headers={"X-Demo-User": GIVER})
        check("refresh-stable", r.status_code == 200
              and r.json()["total"] == after)

    server.should_exit = True
    t.join(timeout=5)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
