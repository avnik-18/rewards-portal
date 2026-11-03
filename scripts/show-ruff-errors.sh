#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker compose up -d db >/dev/null 2>&1
docker rm -f recog-ruff >/dev/null 2>&1 || true
cat > /tmp/DFruff <<'PYEOF'
FROM python:3.12-slim
RUN pip install -q ruff
PYEOF
docker build -q -t recogruff -f /tmp/DFruff /tmp >/dev/null
docker run --rm --network host -v "$PWD:/srv" -w /srv recogruff \
  bash -c "ruff check app tests --output-format concise 2>&1"
docker rm -f recogruff >/dev/null 2>&1
