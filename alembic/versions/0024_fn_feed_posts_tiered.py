"""0024_fn_feed_posts_tiered — per-tier pruned rewrite of fn_feed_posts.

Same fn contract as 0023 (tiered bu > own > team > related, most recent
first, keyset cursor, identical RETURN TABLE shape — no Python changes), but
the body swaps the every-post rank cascade + global sort for four
candidate branches: each prunes itself against the cursor, walks its own
(occurred_at DESC, entity_id DESC) order and stops at p_limit. own_ids /
circle_ids are materialized once instead of probed per row, the org_subtree
recursion becomes UNION (terminates on a corrupted manager cycle), and a
partial or unknown cursor tier raises 22023 here — behind the API's own 422.
The body executes from alembic/sql/functions/0024_fn_feed_posts.sql; only
the feed fn is redefined here — every other fn stays at its prior
definition.
"""

from pathlib import Path

from alembic import op

revision = "0024_fn_feed_posts_tiered"
down_revision = "0023_feed_posts"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    op.execute((SQL_DIR / "0024_fn_feed_posts.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    # restore the 0023 definition — 0024 only redefines a read function, no
    # data changes happened.
    op.execute((SQL_DIR / "0023_fn_feed_posts.sql").read_text(encoding="utf-8"))
