#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-debug >/dev/null 2>&1 || true
for i in {1..20}; do docker exec recog-api-db-1 pg_isready -U postgres -d recog >/dev/null 2>&1 && break; sleep 1; done
docker run -d --name recog-debug --network host -v "$PWD:/srv" -w /srv \
  -e ENVIRONMENT=local -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog \
  recog-test-runner sleep 300 >/dev/null
docker exec -i recog-debug python - <<'EOF'
import asyncio

async def main():
    from uuid import UUID
    from app.db.session import get_session_factory
    from app.repositories.applause_repository import ApplauseRepository
    from app.services.recognition_service import RecognitionService

    actor = UUID("ebbcdfd3-d729-4507-b542-3b8fc1464d1d")
    recipient = UUID("2f6e7963-bcd9-4649-97e3-d7fe97a27e48")
    key = UUID("11111111-2222-3333-4444-555555555555")

    factory = get_session_factory()
    async with factory() as session:
        service = RecognitionService(ApplauseRepository(session))
        for attempt in (1, 2):
            try:
                rid, replayed = await service.submit_recognition(
                    actor, [recipient], None, None, "debug idem", 25, key)
                print(f"attempt {attempt}: rid={rid} replayed={replayed}")
            except Exception as e:
                print(f"attempt {attempt}: FAILED {type(e).__name__}: {str(e)[:120]}")

asyncio.run(main())
EOF
docker rm -f recog-debug >/dev/null
