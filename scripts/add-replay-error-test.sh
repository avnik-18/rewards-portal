#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

p = pathlib.Path("tests/integration/test_recognition_errors.py")
s = p.read_text(encoding="utf-8")
marker = 'DTO_KEYS = {"approval_item_id"'
addition = '''def test_recognition_replay_missing_row_is_integrity_error() -> None:
    """Reviewer: recognition_replay must not invent a 'cancelled' status when
    the projection has no row — a missing row right after fn_submit means the
    DB wrote nothing (integrity fault) → hard error, surfaced as a 500."""
    import asyncio  # noqa: F401
    import uuid

    async def run() -> None:
        from uuid import UUID as UU

        from app.db.session import get_session_factory
        from app.repositories.applause_repository import ApplauseRepository

        factory = get_session_factory()
        async with factory() as session:
            repo = ApplauseRepository(session)
            bogus = str(uuid.uuid4())
            # a genuinely absent recognition (no fn ever recorded it)
            try:
                await repo.recognition_replay(bogus)
            except RuntimeError:
                return  # expected: NOT a fabricated status
            raise AssertionError(
                "missing recognition returned a status instead of failing")

    asyncio.get_event_loop_policy().new_event_loop().run_until_complete(run())


DTO_KEYS = {"approval_item_id"'''
s = s.replace(marker, addition, 1)
p.write_text(s, encoding="utf-8")
print("replay integrity test added")
EOF
echo ok
