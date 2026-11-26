"""0030_cheers_direct_values — Recognize is cheers-for-peers only.

The old point-based approval workflow is retired:
  - fn_submit_recognition redefined: a recognition is a ZERO-point send,
    approved at insert, published to feed_post in the same transaction.
    Nonzero sends are rejected (C5496) — points now live only in the award
    lane (prize_points), wallet holds/routes/approval-rule steps are off
    this path.
  - emids_values is the three values the program runs on: Impact Obsessed,
    Trusted Guides, Inclusive Innovators. Winners are RENAMED in place (ids
    preserved), so history keeps its value; the other values are retired
    (templates cascade-delete, history SET NULL is pre-mapped).

Migration (not editable content): catalog + fn only; the 0006 templates
those values carry keep their art/practice (emoji already fit).
"""

from pathlib import Path

from alembic import op

revision = "0030_cheers_direct_values"
down_revision = "0029_award_cycle_admin"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    # remap consumer rows off the two retiring values BEFORE removal
    op.execute(r"""
    UPDATE recognition_history rh
       SET value_id = (SELECT id FROM emids_values WHERE key = 'innovation')
     WHERE rh.value_id IN (SELECT id FROM emids_values WHERE key = 'collaboration')""")
    op.execute(r"""
    UPDATE recognition_history rh
       SET value_id = (SELECT id FROM emids_values WHERE key = 'ownership')
     WHERE rh.value_id IN (SELECT id FROM emids_values WHERE key = 'winning_mindset')""")
    op.execute(r"""
    UPDATE awards a
       SET value_id = (SELECT id FROM emids_values WHERE key = 'innovation')
     WHERE a.value_id IN (SELECT id FROM emids_values WHERE key = 'collaboration')""")
    op.execute(r"""
    UPDATE awards a
       SET value_id = (SELECT id FROM emids_values WHERE key = 'ownership')
     WHERE a.value_id IN (SELECT id FROM emids_values WHERE key = 'winning_mindset')""")

    # rename the keepers in place (template rows cascade-follow the value)
    op.execute(r"""
    UPDATE emids_values SET key = 'impact_obsessed', label = 'Impact Obsessed' WHERE key = 'ownership'""")
    op.execute(r"""
    UPDATE emids_values SET key = 'trusted_guides', label = 'Trusted Guides' WHERE key = 'customer_first'""")
    op.execute(r"""
    UPDATE emids_values SET key = 'inclusive_innovators', label = 'Inclusive Innovators' WHERE key = 'innovation'""")
    op.execute(r"""
    DELETE FROM emids_values WHERE key IN ('collaboration', 'winning_mindset')""")

    # template display names follow the value label (emoji already fit)
    op.execute(r"""
    UPDATE recognition_templates t
       SET name = v.label
      FROM emids_values v
     WHERE t.value_id = v.id""")

    # cheers go live: the zero-point-direct submit fn
    op.execute((SQL_DIR / "0030_fn_submit_recognition.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    # the fn reverts to the last point-aware body (0023 file)
    op.execute((SQL_DIR / "0023_fn_submit_recognition.sql").read_text(encoding="utf-8"))
    op.execute(r"""
    UPDATE recognition_history rh
       SET value_id = (SELECT id FROM emids_values WHERE key = 'collaboration')
     WHERE rh.value_id IN (SELECT id FROM emids_values WHERE key = 'innovation')""")
    op.execute(r"""
    UPDATE recognition_history rh
       SET value_id = (SELECT id FROM emids_values WHERE key = 'winning_mindset')
     WHERE rh.value_id IN (SELECT id FROM emids_values WHERE key = 'ownership')""")
    op.execute(r"""
    UPDATE awards a
       SET value_id = (SELECT id FROM emids_values WHERE key = 'collaboration')
     WHERE a.value_id IN (SELECT id FROM emids_values WHERE key = 'innovation')""")
    op.execute(r"""
    UPDATE awards a
       SET value_id = (SELECT id FROM emids_values WHERE key = 'winning_mindset')
     WHERE a.value_id IN (SELECT id FROM emids_values WHERE key = 'ownership')""")
    op.execute(r"""
    DELETE FROM recognition_templates WHERE value_id IN (SELECT id FROM emids_values WHERE key IN ('impact_obsessed','trusted_guides','inclusive_innovators'))""")
    op.execute(r"""
    DELETE FROM emids_values WHERE key IN ('impact_obsessed', 'trusted_guides', 'inclusive_innovators')""")
    op.execute(r"""
    INSERT INTO emids_values (key, label) VALUES
      ('customer_first','Customer First'),
      ('innovation','Innovation'),
      ('collaboration','Collaboration'),
      ('ownership','Ownership'),
      ('winning_mindset','Winning Mindset')
    ON CONFLICT (key) DO NOTHING""")
