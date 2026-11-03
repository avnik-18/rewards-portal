#!/usr/bin/env bash
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker exec recog-test-run python - <<'EOF'
import asyncio

async def main():
    from uuid import UUID
    from app.db.session import get_session_factory
    from app.repositories.applause_repository import ApplauseRepository
    from app.services.recognition_service import RecognitionService

    actor = UUID("ebbcdfd3-d729-4507-b542-3b8fc1464d1d")   # E-PR
    recipient = UUID("2f6e7963-bcd9-4649-97e3-d7fe97a27e48")  # E-RH
    key = UUID("11111111-2222-3333-4444-555555555555")

    factory = get_session_factory()
    async with factory() as session:
        service = RecognitionService(ApplauseRepository(session))
        try:
            rid, replayed = await service.submit_recognition(
                actor, [recipient], None, None, "debug idem", 25, key)
            print("first:", rid, "replayed:", replayed)
        except Exception as e:
            print("first FAILED:", type(e).__name__, str(e)[:100])
            return

    async with factory() as session:
        service = RecognitionService(ApplauseRepository(session))
        try:
            rid, replayed = await service.submit_recognition(
                actor, [recipient], None, None, "debug idem", 25, key)
            print("second:", rid, "replayed:", replayed)
        except Exception as e:
            print("second FAILED:", type(e).__name__, str(e)[:100])

asyncio.run(main())
EOF
