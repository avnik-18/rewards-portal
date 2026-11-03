#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

# 1. repository: submit takes the idempotency key; lookup-by-key helper added
p = pathlib.Path("app/repositories/applause_repository.py")
s = p.read_text(encoding="utf-8")
old = '''    async def submit_recognition(
        self,
        from_user: Any,
        to_users: list[Any],
        cc_users: list[Any] | None,
        value_id: Any,
        message: str,
        points: int,
    ) -> str:
        """Call fn_submit_recognition; on success returns the recognition id.

        DB failures propagate as raised (DBAPIError) — the service layer
        translates them to domain errors with the stable business code (see
        recognition_service._error_code)."""
        result = await self._session.execute(
            text(
                "SELECT fn_submit_recognition("
                ":from_user, :to_users, :cc_users, :value_id, NULL, "
                ":message, :points, NULL, 'praise'::recognition_kind, "
                "NULL) AS id"
            ),
            dict(
                from_user=from_user,
                to_users=to_users,
                cc_users=cc_users,
                value_id=value_id,
                message=message,
                points=points,
            ),
        )
        await self._session.commit()  # fn is atomic; nothing further can roll it back
        return str(result.scalar())'''
new = '''    async def submit_recognition(
        self,
        from_user: Any,
        to_users: list[Any],
        cc_users: list[Any] | None,
        value_id: Any,
        message: str,
        points: int,
        idempotency_key: Any = None,
    ) -> str:
        """Call fn_submit_recognition; on success returns the recognition id.

        DB failures propagate as raised (DBAPIError) — the service layer
        translates them to domain errors with the stable business code (see
        recognition_service._error_code). p_idempotency_key dedupes client
        retries at the unique index; the fn does not resolve the conflict."""
        result = await self._session.execute(
            text(
                "SELECT fn_submit_recognition("
                ":from_user, :to_users, :cc_users, :value_id, NULL, "
                ":message, :points, NULL, 'praise'::recognition_kind, "
                ":idempotency_key) AS id"
            ),
            dict(
                from_user=from_user,
                to_users=to_users,
                cc_users=cc_users,
                value_id=value_id,
                message=message,
                points=points,
                idempotency_key=idempotency_key,
            ),
        )
        await self._session.commit()  # fn is atomic; nothing further can roll it back
        return str(result.scalar())

    async def recognition_id_by_key(self, idempotency_key: Any) -> Any:
        """The original recognition for an idempotency key (post-conflict)."""
        result = await self._session.execute(
            text("SELECT id FROM recognition_history WHERE idempotency_key = :key"),
            dict(key=idempotency_key),
        )
        return result.scalar()'''
old_import = '''from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

class ApplauseRepository:'''
new_import = '''from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class ApplauseRepository:'''
s = s.replace(old_import, new_import)
p.write_text(s, encoding="utf-8")
print("repository wired")

# 2. service: recognize takes the key; unique violation replays the original
p = pathlib.Path("app/services/recognition_service.py")
s = p.read_text(encoding="utf-8")
old = '''        try:
            rid = await self.submit_recognition(
                actor_id, to_user_ids, cc_user_ids, value_id, message, points
            )
        except DBAPIError as e:
            raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e'''
new = '''        try:
            rid = await self.submit_recognition(
                actor_id, to_user_ids, cc_user_ids, value_id, message, points,
                idempotency_key,
            )
        except DBAPIError as e:
            # idempotent retry: a unique violation means the client already
            # sent this key — resolve to the ORIGINAL recognition so the
            # retry can never double-spend (reviewer dedupe fix).
            if (
                str(getattr(e.orig, "sqlstate", None) or "") == "23505"
                and idempotency_key is not None
            ):
                original = await self._repo.recognition_id_by_key(idempotency_key)
                if original is None:
                    raise RecognitionDomainError(
                        "idempotency_conflict", "duplicate submit record is missing"
                    ) from e
                rid = UUID(str(original))
            else:
                raise RecognitionDomainError(_error_code(e), _pg_message(e.orig)) from e'''
s = s.replace(old, new)

old_sig = '''    async def recognize(
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
        get_actor_id dependency)."""'''
new_sig = '''    async def recognize(
        self,
        actor_id: UUID,
        to_user_ids: list[UUID],
        cc_user_ids: list[UUID],
        value_id: UUID | None,
        points: int,
        message: str,
        idempotency_key: UUID | None = None,
    ) -> tuple[UUID, str, int, UUID | None]:
        """Returns (recognition_id, status, pending_step_count, approval_item_id|None).

        actor_id is the RESOLVED caller (never body-supplied — see the router's
        get_actor_id dependency). idempotency_key dedupes client retries:
        the replay branch returns the original recognition."""
        await self.submit_recognition  # submit path documented below; see the try block'''
# careful — do not add a bogus statement; keep recognize clean:
new_sig = new_sig.replace("\n        await self.submit_recognition  # submit path documented below; see the try block", "")
s = s.replace(old_sig, new_sig)

old_submit = '''    async def submit_recognition(
        self, actor_id: UUID, to_user_ids: list[UUID], cc_user_ids: list[UUID],
        value_id: UUID | None, message: str, points: int,
    ) -> UUID:'''
new_submit = '''    async def submit_recognition(
        self, actor_id: UUID, to_user_ids: list[UUID], cc_user_ids: list[UUID],
        value_id: UUID | None, message: str, points: int,
        idempotency_key: UUID | None = None,
    ) -> UUID:'''
s = s.replace(old_submit, new_submit)
s = s.replace('''        rid = await self._repo.submit_recognition(
            actor_id, to_user_ids, cc_user_ids, value_id, message, points
        )''', '''        rid = await self._repo.submit_recognition(
            actor_id, to_user_ids, cc_user_ids, value_id, message, points,
            idempotency_key,
        )''')
p.write_text(s, encoding="utf-8")
print("service wired")

# 3. router: accept the Idempotency-Key header, pass through
p = pathlib.Path("app/api/v1/recognitions.py")
s = p.read_text(encoding="utf-8")
old = '''@router.post("/recognitions", response_model=RecognizeResponse)
async def recognize(
    body: RecognizeRequest,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
) -> RecognizeResponse:
    rid, status_text, routed, item = await service.recognize(
        actor_id=actor_id,
        to_user_ids=body.to_user_ids,
        cc_user_ids=body.cc_user_ids,
        value_id=body.value_id,
        points=body.points,
        message=body.message,
    )'''
new = '''@router.post("/recognitions", response_model=RecognizeResponse)
async def recognize(
    body: RecognizeRequest,
    actor_id: Annotated[UUID, Depends(get_actor_id)],
    service: Annotated[RecognitionService, Depends(_service)],
    idempotency_key: Annotated[UUID | None, Header(alias="Idempotency-Key")] = None,
) -> RecognizeResponse:
    rid, status_text, routed, item = await service.recognize(
        actor_id=actor_id,
        to_user_ids=body.to_user_ids,
        cc_user_ids=body.cc_user_ids,
        value_id=body.value_id,
        points=body.points,
        message=body.message,
        idempotency_key=idempotency_key,
    )'''
s = s.replace(old, new)
p.write_text(s, encoding="utf-8")
print("router wired")
EOF
echo ok
