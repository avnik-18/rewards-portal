"""Honesty gate for the integration tier: every other integration test skips
silently when DATABASE_URL is absent — CI without a database would report a
big green number with ZERO integration coverage. This file has NO skipif: if
the live DB is missing, the suite goes red instead of lying green.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

TEST_DB = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/recog"
os.environ.setdefault("DATABASE_URL", TEST_DB)

import pytest  # noqa: E402

from tests.integration.db_helpers import DB_READY  # noqa: E402


def test_integration_tier_requires_live_database() -> None:
    assert DB_READY, (
        "DATABASE_URL did not point at a live applause database — every "
        "integration test in this tier skipped. Run with a reachable local "
        "postgres so these suites actually execute."
    )
