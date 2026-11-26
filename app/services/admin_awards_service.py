"""Admin awards service — thin adapter over AdminAwardsRepository.

The rules (admin gate, prize validation, phase-side-effect windows, tile
derivation) live IN THE DATABASE — fn_admin_list_cycles / fn_admin_upsert_award /
fn_admin_set_award_phase / fn_admin_upsert_cycle_content / fn_awards_tile
(alembic/versions/0027_awards_cycle_content.py). This service only adapts
DTOs and translates fn failures to the stable business codes mapped by the
app-level handler (see the AdminAwardsDomainError handler):
- C549Q -> insufficient_privilege (403)
- C549W -> admin_validation (400)
- C549X -> award_locked (400)
The new SQLSTATEs C549W/C549X are registered in
recognition_service._SQLSTATE_TO_CODE (C549Q already was — insufficient_privilege
is reused, not duplicated under a new code) and the contract table
alembic/versions/0019_fn_errcodes.py."""

from typing import Any
from uuid import UUID

from sqlalchemy.exc import DBAPIError

from app.repositories.admin_awards_repository import AdminAwardsRepository
from app.schemas.admin_awards import (
    AdminApprovalsQueueResponse,
    AdminAwardPhaseRequest,
    AdminAwardUpsertRequest,
    AdminCycleContentRequest,
    AdminCycleCreateRequest,
    AdminCycleResponse,
    AdminCycleTimelineRequest,
    ApprovalsQueueResponse,
    AwardsCycleResponse,
    AwardsTileResponse,
    NominationCreateRequest,
    NominationDecisionRequest,
    NominationResponse,
)
from app.services.recognition_service import (
    RecognitionDomainError,
    _error_code,
    _pg_message,
)


class AdminAwardsDomainError(RecognitionDomainError):
    """Admin-awards fn failure — subclasses RecognitionDomainError so the
    app-wide mapper handler can special-case these codes (main.py)."""


class AdminAwardsService:
    def __init__(self, repo: AdminAwardsRepository) -> None:
        self._repo = repo

    def _domain(self, exc: DBAPIError) -> AdminAwardsDomainError:
        return AdminAwardsDomainError(_error_code(exc), _pg_message(exc.orig))

    async def list_cycles(self, actor_id: UUID) -> list[AdminCycleResponse]:
        try:
            rows = await self._repo.list_cycles(actor_id)
        except DBAPIError as exc:
            raise self._domain(exc) from exc
        return [AdminCycleResponse.model_validate(row) for row in rows]

    async def upsert_award(
        self, actor_id: UUID, request: AdminAwardUpsertRequest
    ) -> UUID:
        try:
            award_id = await self._repo.upsert_award(
                actor_id,
                request.period_id,
                request.id,
                request.name,
                request.value_id,
                request.prize_points,
                request.nominations_end,
                request.nominations_start,
                request.requires_jury,
                request.max_nominations_per_nominator,
                request.cadence,
                request.description,
                request.photo_url,
                [section.model_dump() for section in request.guidelines] or None,
                request.approval_start,
                request.approval_end,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc
        return award_id

    async def set_award_phase(
        self, actor_id: UUID, award_id: UUID, request: AdminAwardPhaseRequest
    ) -> None:
        try:
            await self._repo.set_award_phase(actor_id, award_id, request.phase)
        except DBAPIError as exc:
            raise self._domain(exc) from exc

    async def delete_award(self, actor_id: UUID, award_id: UUID) -> None:
        """Cancelled-only cleanup — the fn owns the 2-day / no-nominations rule."""
        try:
            await self._repo.delete_award(actor_id, award_id)
        except DBAPIError as exc:
            raise self._domain(exc) from exc

    async def upsert_cycle_content(
        self, actor_id: UUID, period_id: UUID, request: AdminCycleContentRequest
    ) -> None:
        try:
            await self._repo.upsert_cycle_content(
                actor_id,
                period_id,
                request.headline,
                request.tagline,
                request.cta_label,
                request.cta_url,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc

    async def create_cycle(self, actor_id: UUID, request: AdminCycleCreateRequest) -> UUID:
        try:
            cycle_id = await self._repo.create_cycle(
                actor_id,
                request.name,
                request.starts,
                request.ends,
                request.nominations_close,
                request.results_on,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc
        return cycle_id

    async def set_cycle_timeline(
        self, actor_id: UUID, period_id: UUID, request: AdminCycleTimelineRequest
    ) -> None:
        try:
            await self._repo.set_cycle_timeline(
                actor_id,
                period_id,
                request.nominations_close,
                request.results_on,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc

    async def cycles_for_user(self, actor_id: UUID) -> list[AwardsCycleResponse]:
        try:
            rows = await self._repo.cycles_for_user(actor_id)
        except DBAPIError as exc:
            raise self._domain(exc) from exc
        return [AwardsCycleResponse.model_validate(row) for row in rows]

    async def submit_nomination(
        self, actor_id: UUID, request: NominationCreateRequest
    ) -> NominationResponse:
        try:
            nomination_id = await self._repo.submit_nomination(
                request.award_id,
                request.nominee_id,
                actor_id,
                request.story,
                request.achievements,
                [doc.model_dump() for doc in request.supporting_docs] or None,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc
        return NominationResponse(id=nomination_id)

    async def approvals_pending(self, viewer_id: UUID) -> ApprovalsQueueResponse:
        """The DH review lane read (0031) scoped to the caller's lanes (0036)
        — adapter only (a read cannot raise a business code, matching
        awards_tile)."""
        queue = await self._repo.approvals_pending(viewer_id)
        return ApprovalsQueueResponse.model_validate(queue)

    async def decide_nomination(
        self, decider_id: UUID, nomination_id: UUID, request: NominationDecisionRequest
    ) -> None:
        try:
            await self._repo.decide_nomination(
                nomination_id,
                decider_id,
                request.decision == "approved",
                request.note,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc

    async def approvals_admin_pending(self) -> AdminApprovalsQueueResponse:
        """The admin final lane read (0034) — adapter only (a read cannot
        raise a business code, matching approvals_pending)."""
        queue = await self._repo.approvals_admin_pending()
        return AdminApprovalsQueueResponse.model_validate(queue)

    async def decide_admin_nomination(
        self, decider_id: UUID, nomination_id: UUID, request: NominationDecisionRequest
    ) -> None:
        try:
            await self._repo.decide_admin_nomination(
                nomination_id,
                decider_id,
                request.decision == "approved",
                request.note,
            )
        except DBAPIError as exc:
            raise self._domain(exc) from exc

    async def awards_tile(self) -> AwardsTileResponse:
        """Read path — a tile read cannot raise a business code, so this is a
        straight adapter (recognition_count parity)."""
        tile: dict[str, Any] = await self._repo.awards_tile()
        return AwardsTileResponse.model_validate(tile)
