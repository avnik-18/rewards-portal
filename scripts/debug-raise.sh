#!/usr/bin/env bash
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-debug >/dev/null 2>&1 || true
docker run -d --name recog-debug --network host -v "$PWD:/srv" -w /srv \
  -e ENVIRONMENT=local \
  -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  recog-test-runner sleep 600 >/dev/null
docker exec -i recog-debug python - <<'EOF'
import asyncio

async def main():
    from uuid import UUID
    from sqlalchemy.exc import DBAPIError
    from app.db.session import get_session_factory
    from app.repositories.applause_repository import ApplauseRepository
    from app.services.recognition_service import (
        _error_code, _pg_message, RecognitionService,
    )

    actor = UUID("ebbcdfd3-d729-4507-b542-3b8fc1464d1d")      # E-PR
    recipient = UUID("2f6e7963-bcd9-4649-97e3-d7fe97a27e48")  # E-RH

    factory = get_session_factory()
    async with factory() as session:
        service = RecognitionService(ApplauseRepository(session))
        try:
            rid = await service.submit_recognition(
                actor, [recipient], None, None, "debug", 9000)
            print("submitted", rid)
        except DBAPIError as e:
            print("DBAPIError raised:")
            print("  _error_code ->", repr(_error_code(e)))
            print("  _pg_message ->", repr(_pg_message(e.orig)))
        except Exception as e:
            print("OTHER exception:", type(e).__module__, type(e).__name__, str(e)[:160])

asyncio.run(main())
EOF
docker rm -f recog-debug >/dev/null
