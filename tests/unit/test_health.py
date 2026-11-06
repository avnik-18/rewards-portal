"""/healthz (liveness) + /api/v1/health (readiness: SELECT 1 against the DB).

/health must be a REAL probe: 200 only when the database answers; 503 when
it doesn't — and it must not leak the environment name to unauthenticated
callers (reviewer comment)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_session
from app.main import app


def test_healthz_returns_ok(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_versioned_health_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_versioned_health_is_readiness_not_liveness(client: TestClient) -> None:
    """The injected session is actually used: a dead DB must show up as 503,
    and the body reports nothing but status (no environment disclosure)."""

    class _DeadSession:
        async def execute(self, *_args: object, **_kwargs: object) -> object:
            raise SQLAlchemyError("connection refused (simulated)")

    app.dependency_overrides[get_session] = lambda: _DeadSession()
    try:
        response = client.get("/api/v1/health")
    finally:
        app.dependency_overrides.pop(get_session)
    assert response.status_code == 503
    assert response.json() == {"detail": "database unreachable"}


@pytest.mark.parametrize("header", ["X-Content-Type-Options", "Cache-Control"])
def test_security_headers_present(header: str) -> None:
    with TestClient(app) as c:
        response = c.get("/api/v1/health")
    assert response.headers.get(header) is not None
