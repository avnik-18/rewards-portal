"""Real-HTTP smoke for /api/v1/media/hero — the shape/gates TestClient covers
cannot assert real-socket behavior; there is no write contention to prove
(unlike count-smoke.py), so the parallel section is deliberately absent:
the endpoint is a pure read.

Boots the actual app under uvicorn (factory mode), then exercises:
1. shape + content over REAL sockets (200, exact key set, url https, pulled
   from the seeded hero — cross-checked against SQL truth)
2. identity gates (400 missing header / 404 unknown demo user)
3. no-live-hero → 404 {"detail": "hero_not_published"} over a real socket,
   plus restoration and re-read stability

Exit code 0 only if everything holds.

Run: .venv/bin/python tests/integration/hero-smoke.py
"""

import os
import sys
import time
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)
os.environ.setdefault("ENVIRONMENT", "local")

import httpx                # noqa: E402
import sqlalchemy as sa     # noqa: E402
import uvicorn              # noqa: E402
from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import seed_demo_if_missing  # noqa: E402

HOST, PORT = "127.0.0.1", 8878
BASE = f"http://{HOST}:{PORT}/api/v1"
USER = "E-PR"

_SYNC = sa.create_engine(TEST_DB.replace("+asyncpg", "+psycopg2"))


def _hero_id() -> str:
    """Idempotently un-stick a hero left deactivated by a run killed between
    its deactivate and restore, then resolve the live row. () when none."""
    with _SYNC.begin() as conn:
        conn.execute(sa.text(
            "UPDATE media_asset SET is_active = true "
            "WHERE kind = 'hero_carousel_video' AND is_active = false "
            "  AND effective_to IS NULL"))
    with _SYNC.connect() as conn:
        val = conn.execute(sa.text(
            "SELECT id FROM media_asset WHERE kind='hero_carousel_video' "
            "AND is_active AND effective_to IS NULL "
            "AND effective_from <= now() LIMIT 1")).scalar()
        return str(val) if val is not None else ""


def main() -> int:
    seed_demo_if_missing()
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

    hero_id = _hero_id()
    with httpx.Client(base_url=BASE, timeout=30) as c:
        if not hero_id:
            # fail loudly here, never downstream as UPDATE ... id = 'None'
            check("seeded-live-hero-present", False,
                  "no live hero in media_asset — seed/demo.sql needed")
            server.should_exit = True
            t.join(timeout=5)
            return 1
        # 1) shape + live content over a real socket
        r = c.get("/media/hero", headers={"X-Demo-User": USER})
        body = r.json() if r.status_code == 200 else {}
        check("shape", r.status_code == 200
              and set(body.keys()) == {"id", "title", "url", "poster_url",
                                       "cta_label", "cta_url"},
              str(set(body)) if body else f"status {r.status_code}")
        check("pulled-seeded-hero", str(body.get("id")) == hero_id,
              f"{body.get('id')} vs {hero_id}")
        check("url-https", str(body.get("url", "")).startswith("https://"))

        # 2) identity gates over real sockets
        check("400-no-header", c.get("/media/hero").status_code == 400)
        check("404-unknown-user",
              c.get("/media/hero", headers={"X-Demo-User": "NOBODY"}).status_code == 404)

        # 3) unpublished contract over a real socket, then come back
        try:
            with _SYNC.begin() as conn:
                conn.execute(sa.text(
                    "UPDATE media_asset SET is_active = false WHERE id = :i"),
                    {"i": hero_id})
            r = c.get("/media/hero", headers={"X-Demo-User": USER})
            check("unpublished-404", r.status_code == 404
                  and r.json() == {"detail": "hero_not_published"},
                  f"status {r.status_code} body {r.json() if r.status_code == 404 else ''}")
        finally:
            with _SYNC.begin() as conn:
                conn.execute(sa.text(
                    "UPDATE media_asset SET is_active = true WHERE id = :i"),
                    {"i": hero_id})
        r = c.get("/media/hero", headers={"X-Demo-User": USER})
        check("restored-stable", r.status_code == 200
              and str(r.json().get("id")) == hero_id)

    server.should_exit = True
    t.join(timeout=5)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
