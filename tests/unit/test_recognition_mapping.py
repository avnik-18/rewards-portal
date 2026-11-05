"""Mapping-table contract for fn_* business codes → HTTP semantics.

Pins the reviewer's spec:
- not_pending_for_decider         → 403
- item_already_<status> (family)  → 409
- approver_unresolvable[_at_step_N] → 404
- known sets (insufficient_points, no_approval_route, ...)
- ANYTHING unlisted               → 500 (the closing branch)
"""

import os

os.environ.setdefault("ENVIRONMENT", "local")  # imports read settings

from fastapi import status  # noqa: E402

from app.api.v1.recognitions import _code_status  # noqa: E402


def test_not_pending_for_decider_is_403() -> None:
    assert _code_status("not_pending_for_decider") == status.HTTP_403_FORBIDDEN


def test_item_already_family_is_409() -> None:
    for code in ("item_already_pending", "item_already_approved",
                 "item_already_declined", "item_already_returned",
                 "item_already_cancelled"):
        assert _code_status(code) == status.HTTP_409_CONFLICT, code


def test_approver_unresolvable_family_is_404() -> None:
    assert _code_status("approver_unresolvable") == status.HTTP_404_NOT_FOUND
    assert _code_status("approver_unresolvable_at_step_2") == status.HTTP_404_NOT_FOUND


def test_known_business_codes_map() -> None:
    assert _code_status("insufficient_points") == status.HTTP_409_CONFLICT
    assert _code_status("person_inactive") == status.HTTP_409_CONFLICT
    assert _code_status("double_refund_blocked") == status.HTTP_409_CONFLICT
    assert _code_status("self_recognition_blocked") == status.HTTP_409_CONFLICT
    assert _code_status("no_approval_route") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("decline_note_required") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("recipient_total_mismatch") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("guest_cannot_receive") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("no_allowance_for_period") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("allocation_below_spent") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("prize_pool_empty") == status.HTTP_404_NOT_FOUND


def test_every_sqlstate_code_maps_to_http() -> None:
    """Every code raised in the fns (all of _SQLSTATE_TO_CODE's values) maps
    to an HTTP status above 400 — the router table can never drift into a
    silent 500 for a mapped business failure (reviewer ask). The only
    explicit 500s are the coded integrity faults (INTEGRITY_FAULTS)."""
    from app.api.v1.recognitions import INTEGRITY_FAULTS
    from app.services.recognition_service import _SQLSTATE_TO_CODE
    for code in _SQLSTATE_TO_CODE.values():
        if code in INTEGRITY_FAULTS:
            assert _code_status(code) == status.HTTP_500_INTERNAL_SERVER_ERROR, code
            continue
        assert _code_status(code) != status.HTTP_500_INTERNAL_SERVER_ERROR, code
        assert _code_status(code) in {
            status.HTTP_403_FORBIDDEN,
            status.HTTP_409_CONFLICT,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            status.HTTP_404_NOT_FOUND,
        }, code


def test_admin_authority_codes_are_403() -> None:
    assert _code_status("self_admin_blocked") == status.HTTP_403_FORBIDDEN
    assert _code_status("insufficient_privilege") == status.HTTP_403_FORBIDDEN


def test_account_not_found_is_404() -> None:
    assert _code_status("account_not_found") == status.HTTP_404_NOT_FOUND


def test_review_flagged_codes_no_longer_500() -> None:
    assert _code_status("points_out_of_range") == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert _code_status("recipient_not_found") == status.HTTP_404_NOT_FOUND
    assert _code_status("item_not_found") == status.HTTP_404_NOT_FOUND
    assert _code_status("person_not_found") == status.HTTP_404_NOT_FOUND


def test_unmapped_code_falls_to_500() -> None:
    # the reviewer's closing-branch requirement
    assert _code_status("journal_not_balanced") == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert _code_status("accounts_missing") == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert _code_status("totally_unknown_code") == status.HTTP_500_INTERNAL_SERVER_ERROR
