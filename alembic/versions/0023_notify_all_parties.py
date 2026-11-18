"""0023_notify_all_parties — recognition notifications for every party.

Before this revision only the SUBMITTER (approval_pending at routing) and the
'TO' RECIPIENTS (praise_received at release) were told. The cc(s) and the giver
were silent, and zero-point sends (no hold → no release) were silent entirely.

What lands here:
  - notification_type gains 'praise_sent' (giver) and 'praise_cc' (cc rows)
  - fn_notify_recognition_parties: one idempotent place that notifies the
    receivers, the giver, and the cc(s) of a recognition
  - fn_release_recognition routes its party notifies through that helper
    (ledger semantics unchanged from 0021)
  - fn_submit_recognition notifies the parties on the zero-point path (0-pt
    sends never reach release) — guards/routing carried over from 0022 as-is
  - a one-time backfill: past APPROVED recognitions get giver/cc rows (the
    receiver rows already exist from release)

Codes: none new. Dedupe keys pin each party once per recognition:
  praise:<rec>:<user> / praise_sent:<rec>:<user> / praise_cc:<rec>:<user>
"""
from pathlib import Path

from alembic import op

revision = "0023_notify_all_parties"
down_revision = "0022_fn_submit_refs"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql" / "functions"


def upgrade() -> None:
    # ADD VALUE must actually COMMIT before the new values are used in the
    # same migration's statements — hence the autocommit block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'praise_sent';")
        op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'praise_cc';")
    op.execute((SQL_DIR / "0023_fn_notify_parties.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0023_fn_release_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0023_fn_submit_recognition.sql").read_text(encoding="utf-8"))
    op.execute(
        """
        INSERT INTO notification (user_id, type, channel, payload, delivery_status, created_at, dedupe_key)
        SELECT rh.from_user_id, 'praise_sent', 'in_app',
               jsonb_build_object('points', rh.base_points), 'sent', rh.occurred_at,
               'praise_sent:' || rh.id::text || ':' || rh.from_user_id::text
          FROM recognition_history rh
         WHERE rh.status = 'approved'
           AND NOT EXISTS (SELECT 1 FROM notification n
                            WHERE n.dedupe_key = 'praise_sent:' || rh.id::text || ':' || rh.from_user_id::text);

        INSERT INTO notification (user_id, type, channel, payload, delivery_status, created_at, dedupe_key)
        SELECT rr.user_id, 'praise_cc', 'in_app',
               jsonb_build_object('points', rh.base_points), 'sent', rh.occurred_at,
               'praise_cc:' || rh.id::text || ':' || rr.user_id::text
          FROM recognition_history rh
          JOIN recognition_recipients rr ON rr.recognition_id = rh.id AND rr.kind = 'cc'
         WHERE rh.status = 'approved'
           AND NOT EXISTS (SELECT 1 FROM notification n
                            WHERE n.dedupe_key = 'praise_cc:' || rh.id::text || ':' || rr.user_id::text);
        """
    )


def downgrade() -> None:
    # restore the 0021/0022 fn definitions; enum values are kept (dropping them
    # would brawl with rows that already carry the types)
    op.execute((SQL_DIR / "0021_fn_release_recognition.sql").read_text(encoding="utf-8"))
    op.execute((SQL_DIR / "0022_fn_submit_recognition.sql").read_text(encoding="utf-8"))
