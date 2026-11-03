#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

# 1. add the fn_allowance/fn_finalize ERRCODEs where the head migration blocks
#    have raised them + service maps by SQLSTATE
python3 - <<'EOF'
import pathlib

# 1a. service: map the SQLSTATE → business code instead of parsing the message
p = pathlib.Path("app/services/recognition_service.py")
s = p.read_text(encoding="utf-8")
old = """    sqlstate = str(getattr(orig, "sqlstate", None) or "P0001")
    if sqlstate != "P0001":
        return sqlstate
    message = _pg_message(orig)
    first = message.split(":", 1)[0].strip()
    if not first:
        return ""
    return first if all(part.isidentifier() for part in first.split("_")) else ""
"""
new = '''
_SQLSTATE_TO_CODE = {
    "C54901": "insufficient_points",
    "C54902": "person_inactive",
    "C54903": "double_refund_blocked",
    "C54904": "self_recognition_blocked",
    "C54905": "item_already_pending",
    "C54906": "points_out_of_range",
    "C54910": "recipient_not_found",
    "C54911": "guest_cannot_receive",
    "C54912": "recipient_total_mismatch",
    "C54913": "no_allowance_for_period",
    "C54914": "allocation_below_spent",
    "C54915": "no_approval_route",
    "C54916": "approver_unresolvable_at_step",
    "C54917": "not_pending_for_decider",
    "C54918": "prize_pool_empty",
    "C54919": "decline_note_required",
    "C54920": "item_not_found",
    "C54921": "person_not_found",
}
# legacy item_already_* variant (fn_item_decide): the fn-item decider emits
sqlstate_to_legacy = {
    "C54905": "item_already_pending",
}

def _sqlstate_to_code(sqlstate: str) -> str:
    return _SQLSTATE_TO_CODE.get(sqlstate, sqlstate)


def _error_code(exc: DBAPIError) -> str:
    """Derive the machine-stable business code from a fn_ failure.

    1. e.orig.sqlstate — the sole mapping key: every FN raises WITH a custom
       ERRCODE (0019_fn_errcodes) and the mapping above resolves the code.
    2. Transitional bridge for pre-ERRCODE databases (existing dev/staging
       environments where the head state predates 0019): the business code is
       the first word of the primary message ("insufficient_points: ...").
       Deletes when all deployed environments have 0019 applied.
    Anything unrecognised returns the empty string → the caller maps to 500."""
    orig = exc.orig
    sqlstate = str(getattr(orig, "sqlstate", None) or "P0001")
    if sqlstate in _SQLSTATE_TO_CODE:
        return _SQLSTATE_TO_CODE[sqlstate]
    if sqlstate != "P0001":
        return sqlstate
    message = _pg_message(orig)
    first = message.split(":", 1)[0].strip()
    if not first:
        return ""
    return first if all(part.isidentifier() for part in first.split("_")) else ""
'''
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("service bridge to sqlstate-first applied")

# 2. handler: map item_already family by prefix or via sqlstate mapping, keep
#    the code sets as fallback
p = pathlib.Path("app/api/v1/recognitions.py")
s = p.read_text(encoding="utf-8")
s = s.replace('''CONFLICT = {"insufficient_points", "person_inactive", "double_refund_blocked",
            "self_recognition_blocked"}
UNPROCESSABLE = {"no_approval_route", "decline_note_required", "recipient_total_mismatch",
                 "guest_cannot_receive", "no_allowance_for_period", "allocation_below_spent"}
NOT_FOUND = {"approver_unresolvable", "prize_pool_empty"}


def _code_status(code: str) -> int:
    if code == "not_pending_for_decider":
        return status.HTTP_403_FORBIDDEN
    if code == "item_state_mismatch":
        return status.HTTP_409_CONFLICT
    if any(code.startswith(prefix) for prefix in ("approver_unresolvable",)):
        return status.HTTP_404_NOT_FOUND
    if any(code.startswith(prefix) for prefix in ("item_already_",)):
        return status.HTTP_409_CONFLICT
    if code in CONFLICT:
        return status.HTTP_409_CONFLICT
    if code in UNPROCESSABLE:
        return status.HTTP_422_UNPROCESSABLE_ENTITY
    if code in NOT_FOUND:
        return status.HTTP_404_NOT_FOUND
    return status.HTTP_500_INTERNAL_SERVER_ERROR''',
'''UNAUTHORIZED = {"not_pending_for_decider"}


def _code_status(code: str) -> int:
    if code in UNAUTHORIZED:
        return status.HTTP_403_FORBIDDEN
    if any(code.startswith(prefix) for prefix in ("approver_unresolvable",)):
        return status.HTTP_404_NOT_FOUND
    if any(code.startswith(prefix) for prefix in ("item_already_",)):
        return status.HTTP_409_CONFLICT
    if code in CONFLICT:
        return status.HTTP_409_CONFLICT
    if code in UNPROCESSABLE:
        return status.HTTP_422_UNPROCESSABLE_ENTITY
    if code in NOT_FOUND:
        return status.HTTP_404_NOT_FOUND
    return status.HTTP_500_INTERNAL_SERVER_ERROR''')
p.write_text(s, encoding="utf-8")
print("handler mapping-table updated")
EOF
echo ok
