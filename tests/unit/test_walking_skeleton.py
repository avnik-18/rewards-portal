from fastapi.testclient import TestClient


def test_demo_route_removed(client: TestClient) -> None:
    """Reviewer: the unauth demo route is scaffold left in production — removed."""
    response = client.get("/api/v1/demo/Priya")
    assert response.status_code == 404


def test_me_route_requires_identity_in_dev(client: TestClient) -> None:
    # /me and /me/stats are caller-scoped: in dev mode the X-Demo-User header
    # IS the identity. Without it the request is rejected with 400 before any
    # DB work (covered live in tests/integration/test_identity_stats.py).
    assert client.get("/api/v1/me").status_code == 400
    assert client.get("/api/v1/me/stats").status_code == 400
