"""0024_feed_ranked — fn_feed_posts is re-scored per viewer.

0023 bracketed the feed by relationship tier (bu > own > team > related, then
recency inside a bucket). 0024 replaces the bucket sort with the designed
continuous score so two people with different org positions get different
orders from the same feed_post rows:

    score = tier_weight x decay + milestone_today_boost

  tier_weight (strongest match, never stacked)
      100 own (giver or to/cc recipient)
       75 manager chain (manager / manager's manager / reports subtree)
       70 teammate in a team the viewer leads
       60 teammate (shares an open team)
       35 same BU (is_bu row or same users.department)
       15 rest of org
  decay  praise/award 1/(h+2)^0.6 · welcome 1/(h+48)^0.5 · milestone 1/(h+72)^0.5
  boost  +25 while a milestone's occurred_at is today

The cursor keys become (score, occurred_at, entity_id); the legacy tier text
(own/team/bu/related) is still returned for badge semantics. feed_post itself
is untouched — publication stays the 0023 contract (row present = live).
"""

from pathlib import Path

from alembic import op

revision = "0024_feed_ranked"
# runs after #13's 0024_fn_feed_posts_tiered (which still carries the 0023
# tier-bucket contract) and joins the 0023_notify_all_parties branch in as a
# parent — one head again, with the scored fn as the final definition
down_revision = ("0024_fn_feed_posts_tiered", "0023_notify_all_parties")
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    # the re-scored fn has a new signature (float cursor instead of the tier
    # text) — CREATE OR REPLACE would coexist with the tiered overload as a
    # second function and make untyped-NULL calls ambiguous, so drop the old
    # overload first
    op.execute("DROP FUNCTION IF EXISTS fn_feed_posts(uuid, integer, text, timestamptz, uuid)")
    op.execute((SQL_DIR / "0024_fn_feed_posts_scored.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    # restore the tiered definition (the #13 perf rewrite, its own upgrade)
    op.execute((SQL_DIR / "0024_fn_feed_posts.sql").read_text(encoding="utf-8"))
