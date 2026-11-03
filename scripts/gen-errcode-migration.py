"""Generate alembic/versions/0019_fn_errcodes.py.

Creates a revision that recreates the fn_* functions with
`USING ERRCODE = 'C549xx'` on every business RAISE — so the API maps on
e.orig.sqlstate (one table, no message parsing), per the lead's error-map
review. The downgrade carries the verbatim pre-ERRCODE bodies so it is an
exact reconstruction of the 0013/0015/0017 state."""

import pathlib
import re

ROOT = pathlib.Path("alembic/versions")
OUT = ROOT / "0019_fn_errcodes.py"

# business code word → SQLSTATE (C549xx = the project's user-defined range)
ERRCODES = {
    "insufficient_points": "C54901",
    "person_inactive": "C54902",
    "double_refund_blocked": "C54903",
    "self_recognition_blocked": "C54904",
    "points_out_of_range": "C54906",
    "recipient_not_found": "C54910",
    "guest_cannot_receive": "C54911",
    "recipient_total_mismatch": "C54912",
    "no_allowance_for_period": "C54913",
    "allocation_below_spent": "C54914",
    "no_approval_route": "C54915",
    "prize_pool_empty": "C54918",
    "decline_note_required": "C54919",
    "item_not_found": "C54920",
    "person_not_found": "C54921",
    "not_pending_for_decider": "C54917",
}

DYN = {
    "item_already_pending": "C54905",          # item_already_% family
    "item_already_approved": "C54905",
    "item_already_declined": "C54905",
    "item_already_returned": "C54905",
    "item_already_cancelled": "C54905",
    "item_already_%": "C54905",
    "approver_unresolvable_at_step": "C54916",
    "approver_unresolvable_at_step_%": "C54916",
}


def sqlstate_for(word: str) -> str | None:
    if word in DYN:
        return DYN[word]
    return ERRCODES.get(word)


SRC_FILES = ["0013_fn_flows.py", "0015_staff_fn.py", "0017_admin_flows.py"]
TARGETS = ["fn_submit_recognition", "fn_approve_recognition", "fn_decline_recognition",
           "fn_admin_set_budget", "fn_allowance_seed", "fn_deactivate_person"]


def extract() -> dict[str, str]:
    blocks: dict[str, str] = {}
    for fname in SRC_FILES:
        text = (ROOT / fname).read_text(encoding="utf-8")
        for m in re.finditer(r"CREATE OR REPLACE FUNCTION (fn_\w+)\(.*?LANGUAGE plpgsql\s*;?",
                             text, flags=re.S):
            name = m.group(1)
            if name in TARGETS:
                blocks[name] = m.group(0)
    missing = [t for t in TARGETS if t not in blocks]
    if missing:
        raise SystemExit(f"missing fn blocks: {missing}")
    return blocks


def add_errcode(body: str) -> str:
    def _sub(m: re.Match) -> str:
        message_word = m.group(1)
        code = sqlstate_for(message_word)
        if code is None:
            return m.group(0)
        return m.group(0).rstrip(";") + f" USING ERRCODE = '{code}';"

    return re.sub(
        r"RAISE\s+EXCEPTION\s+'(\w[\w%]*)'[^;]*;",
        _sub, body, flags=re.S)


def strip_errcode(body: str) -> str:
    return re.sub(r"\s*USING ERRCODE = 'C\d+'", "", body)


blocks = extract()

up_parts = [add_errcode(blocks[n]) for n in TARGETS]
down_parts = [strip_errcode(blocks[n]) for n in TARGETS]

out = f'''"""0019_fn_errcodes — recreate fn_* with USING ERRCODE business codes.

Every business raise now carries a project SQLSTATE (C549xx series; primary
messages unchanged) so the API maps on e.orig.sqlstate — one table, no
message-prefix parsing (the bridge in recognition_service._error_code is
scheduled for deletion once this lands).
"""
from alembic import op

revision = "0019_fn_errcodes"
down_revision = "0018_admin_fallback"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(r"""
{chr(10).join(up_parts)}
    """)


def downgrade() -> None:
    # exact reconstruction of the pre-0019 fn bodies (0013/0015/0017 verbatim)
    op.execute(r"""
{chr(10).join(down_parts)}
    """)
'''

OUT.write_text(out, encoding="utf-8")
print(f"wrote {OUT} ({len(out)} chars); fns: {', '.join(TARGETS)}")
