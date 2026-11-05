"""0020_media_asset — portal media (hero videos, news banners) as URL links; admins swap links.

Canonical Alembic revision — hand-written plain SQL, runs in one transaction.
"""

from alembic import op

revision = "0020_media_asset"
down_revision = "0019_fn_errcodes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(r"""
    CREATE TYPE media_kind AS ENUM (
      'hero_carousel_video',
      'news_banner'
    );

    -- Placement registry only: media itself lives on the CDN/blob store and
    -- the DB stores the link. Admins swap the URL when new videos/banners come.
    CREATE TABLE media_asset (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind           media_kind NOT NULL,
      title          text NOT NULL,
      url            text NOT NULL,
      poster_url     text,
      cta_label      text,
      cta_url        text,
      sort_order     int NOT NULL DEFAULT 0,
      is_active      boolean NOT NULL DEFAULT true,
      effective_from timestamptz NOT NULL DEFAULT now(),
      effective_to   timestamptz,
      created_by     uuid REFERENCES users(id),
      updated_by     uuid REFERENCES users(id),
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT media_asset_url_chk CHECK (url ~* '^https://'),
      CONSTRAINT media_asset_poster_url_chk CHECK (poster_url IS NULL OR poster_url ~* '^https://'),
      CONSTRAINT media_asset_cta_url_chk CHECK (cta_url IS NULL OR cta_url ~* '^https://'),
      CONSTRAINT media_asset_cta_pair_chk CHECK (cta_url IS NULL OR cta_label IS NOT NULL),
      CONSTRAINT media_asset_window_chk CHECK (effective_to IS NULL OR effective_to > effective_from)
    );

    -- the reader's index: what is live for a placement, in display order.
    -- Live-rule for readers: is_active AND effective_to IS NULL AND
    -- effective_from <= now() — effective_from cannot move into the index
    -- predicate (now() is non-immutable), so the API applies it while paging.
    CREATE INDEX media_asset_active_idx ON media_asset (kind, sort_order)
      WHERE is_active AND effective_to IS NULL;

    -- hero singleton: at most ONE active hero carousel video outside any window
    CREATE UNIQUE INDEX media_asset_hero_uniq ON media_asset (kind)
      WHERE kind = 'hero_carousel_video' AND is_active AND effective_to IS NULL;

    CREATE TRIGGER media_asset_touch BEFORE UPDATE ON media_asset
      FOR EACH ROW EXECUTE FUNCTION trg_touch_updated_at()""")


def downgrade() -> None:
    op.execute(r"""
    DROP TRIGGER IF EXISTS media_asset_touch ON media_asset;
    DROP TABLE IF EXISTS media_asset;
    DROP TYPE IF EXISTS media_kind""")
