"""Recognition business rules — thin above ApplauseRepository.

The money math, routing, ledger and approval-chain rules live IN THE DATABASE
(fn_submit_recognition / fn_item_decide, see db/README.md). This service only:
- adapts repository results to DTOs
- translates ValidationError → domain exceptions (routers map to 409/422)
- checks the giver/recipient distinctness and points sanity once here for a
  friendly message even before the DB raises (never silently clamp)
"""

from uuid import UUID

from app.repositories.applause_repository import (
    ApplauseRepository,
    ValidationError,
)


class RecognitionDomainError(Exception):
    """Carries the fn_* error code so routers can map to HTTP semantics."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


class RecognitionService:
    def __init__(self, repo: ApplauseRepository) -> None:
        self._repo = repo

    async def recognize(
        self,
        actor_id: UUID,
        to_user_ids: list[UUID],
        cc_user_ids: list[UUID],
        value_id: UUID | None,
        points: int,
        message: str,
    ) -> tuple[UUID, str, int, UUID | None]:
        """Returns (recognition_id, status, pending_step_count, approval_item_id|None).

        actor_id is the RESOLVED caller (never body-supplied — see the router's
        _actor_id dependency).
        """
        if points != 0 and actor_id in to_user_ids:
            raise RecognitionDomainError(
                "self_recognition_blocked", "the giver cannot also be a recipient"
            )
        try:
            rid = await self._repo.submit_recognition(
                actor_id, to_user_ids, cc_user_ids, value_id, message, points
            )
        except ValidationError as e:
            raise RecognitionDomainError(e.args[0].split(":")[0], e.args[0].strip()) from e

        # status + routing depth: pending means the chain is frozen and waiting;
        # routed_to = how many steps await; item id matches the pending approval
        status, routed, item = await self._repo.recognition_replay(rid)
        return UUID(str(rid)), status, routed, item

    async def decide(
        self,
        item_id: UUID,
        approver_id: UUID,
        approve: bool,
        note: str | None,
    ) -> str:
        """approver_id is the RESOLVED caller (never body-supplied)."""
        if not approve and not (note and note.strip()):
            raise RecognitionDomainError("decline_note_required", "declining requires a note")
        try:
            return await self._repo.decide_approval(item_id, approver_id, approve, note)
        except ValidationError as e:
            raise RecognitionDomainError(e.args[0].split(":")[0], e.args[0].strip()) from e

    async def pending_for(self, approver_id: UUID) -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        async for row in self._repo.pending_approvals(approver_id):
            rows.append(row)
        return rows
