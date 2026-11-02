#!/usr/bin/env bash
# Run unit tests in an ephemeral python container (no local Python needed):
#   docker run --rm -v "$PWD:/srv" -w /srv python:3.12-slim bash /srv/scripts/test-in-docker.sh
#
# Dependency list mirrors pyproject [project].dependencies + test needs on
# purpose: we deliberately do NOT `pip install .` here, so pytest imports and
# measures the local app/ tree (an installed copy would shadow it).
set -euo pipefail

pip install --quiet \
    fastapi "uvicorn[standard]" "sqlalchemy[asyncio]" asyncpg alembic \
    pydantic-settings structlog opentelemetry-sdk \
    opentelemetry-instrumentation-fastapi httpx \
    pytest pytest-asyncio pytest-cov

pytest -q
