"""Test environment must be explicit BEFORE app imports: the app refuses to
start without identity configuration (fail-closed identity preflight), so the
test suite pins ENVIRONMENT=local for every run."""

import os

os.environ.setdefault("ENVIRONMENT", "local")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
