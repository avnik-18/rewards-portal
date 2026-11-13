"""/media/hero over the live DB — skipped unless DATABASE_URL points at an
alembic-applied schema with (optionally) the seed applied.

Environment: DATABASE_URL (default: the compose recog demo URL), overridable
before import — same helpers as test_recognitions_count.py.

Contract under test (settled with the design-review agent against
0020_media_asset's documented reader live-rule AND its partial unique index):
1. shape: 200 body is EXACTLY {id,title,url,poster_url,cta_label,cta_url},
   cross-checked against the live-rule SQL (never a constant); DB CHECKs
   already force https and the CTA pair — asserted here, not re-invented
2. identity gates: no header → 400; unknown demo user → 404 (the shared
   get_actor_id dependency, not media-specific)
3. no live hero → 404 {"detail": "hero_not_published"} (deactivate the
   seeded hero; 200 again after reactivation)
4. windowed hero invisible: a past effective_to removes the row from the
   reader rule — 404, then 200 after NULLing the window back
5. singleton: the partial unique index exists; serving 200 implies exactly
   one live hero; a second active unwindowed hero cannot be inserted
6. surface sanity: GET-only (POST → 405) in OpenAPI
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)

import pytest  # noqa: E402
import sqlalchemy as sa  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.exc import IntegrityError  # noqa: E402

from app.main import create_app  # noqa: E402
from tests.integration.db_helpers import (  # noqa: E402
    DB_READY,
    _SYNC_ENGINE,
    db_exec,
    seed_demo_if_missing,
)

HERO_KEYS = {"id", "title", "url", "poster_url", "cta_label", "cta_url"}


@pytest.mark.skipif(not DB_READY, reason="no live applause DB (set DATABASE_URL)")
def test_media_hero_flow() -> None:
    seed_demo_if_missing()

    with TestClient(create_app()) as client:
        # 1) shape over the seeded hero, cross-checked against SQL truth
        r = client.get("/api/v1/media/hero", headers={"X-Demo-User": "E-PR"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert set(body.keys()) == HERO_KEYS

        truth_id = db_exec(
            "SELECT id::text FROM media_asset "
            "WHERE kind='hero_carousel_video' AND is_active "
            "  AND effective_to IS NULL AND effective_from <= now() LIMIT 1")
        assert truth_id, "seeded hero must satisfy the reader live-rule in SQL"
        assert str(body["id"]) == truth_id
        assert body["title"] == db_exec(
            "SELECT title FROM media_asset WHERE id = :i", {"i": truth_id})
        assert body["url"].startswith("https://")
        assert body["poster_url"] is None or body["poster_url"].startswith("https://")
        assert body["cta_url"] is None or body["cta_label"] is not None

        # 2) identity gates come from the shared dependency
        assert client.get("/api/v1/media/hero").status_code == 400
        assert client.get("/api/v1/media/hero",
                          headers={"X-Demo-User": "NOBODY-HERE"}).status_code == 404

        # 3) empty state: the deactivated hero is not published
        try:
            db_exec("UPDATE media_asset SET is_active = false WHERE id = :i",
                    {"i": truth_id})
            r = client.get("/api/v1/media/hero", headers={"X-Demo-User": "E-PR"})
            assert r.status_code == 404, r.text
            assert r.json() == {"detail": "hero_not_published"}
        finally:
            db_exec("UPDATE media_asset SET is_active = true WHERE id = :i",
                    {"i": truth_id})
        assert client.get("/api/v1/media/hero",
                          headers={"X-Demo-User": "E-PR"}).status_code == 200

        # 4) windowed hero invisible: a past effective_to hides the row under
        # the documented reader rule (a windowed hero is never publicly
        # served — flagged to the schema owner, kept verbatim in the API)
        try:
            db_exec("UPDATE media_asset SET effective_to = now() - "
                    "interval '1 hour' WHERE id = :i", {"i": truth_id})
            assert client.get("/api/v1/media/hero",
                              headers={"X-Demo-User": "E-PR"}).status_code == 404
        finally:
            db_exec("UPDATE media_asset SET effective_to = NULL "
                    "WHERE id = :i", {"i": truth_id})

        # 5) singleton: the partial unique index is live; a second active
        # unwindowed hero cannot exist
        assert db_exec("SELECT count(*) FROM pg_indexes "
                       "WHERE indexname = 'media_asset_hero_uniq'") == "1"
        assert int(db_exec(
            "SELECT count(*) FROM media_asset WHERE kind='hero_carousel_video' "
            "AND is_active AND effective_to IS NULL")) == 1
        with _SYNC_ENGINE.connect() as conn:
            with pytest.raises(IntegrityError):
                conn.execute(sa.text(
                    "INSERT INTO media_asset (kind, title, url) VALUES "
                    "('hero_carousel_video', 'second-hero-dup-probe', "
                    "'https://cdn.emids.test/hero-dup-probe.mp4')"))
            conn.rollback()

        # 6) surface: only GET exists; POST is 405; one path in OpenAPI
        r = client.post("/api/v1/media/hero")
        assert r.status_code == 405
        schema = client.get("/openapi.json").json()
        assert "/api/v1/media/hero" in schema["paths"]
        assert "get" in schema["paths"]["/api/v1/media/hero"]
        assert "post" not in schema["paths"]["/api/v1/media/hero"]
