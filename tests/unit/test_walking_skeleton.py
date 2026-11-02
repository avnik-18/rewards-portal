from fastapi.testclient import TestClient


def test_demo_route_goes_through_service_layer(client: TestClient) -> None:
    response = client.get("/api/v1/demo/Priya")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Priya"
    assert body["message"] == "Hello, Priya!"


def test_me_route_uses_current_user_dependency(client: TestClient) -> None:
    # No ENTRA_AUTHORITY configured → dev fallback identity, never a 401.
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["id"] == "anonymous"
