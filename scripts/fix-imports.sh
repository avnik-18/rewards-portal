#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-fix >/dev/null 2>&1 || true
docker run -d --name recog-fix --network host -v "$PWD:/srv" -w /srv recog-test-runner sleep 600 >/dev/null
docker exec recog-fix bash -c "cd /srv && ruff check --fix app/api/v1/recognitions.py tests/integration/test_recognition_errors.py && ruff check app/api/v1/recognitions.py tests/integration/test_recognition_errors.py --output-format concise"
docker rm -f recog-fix >/dev/null
