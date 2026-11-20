from fastapi.testclient import TestClient

from src.main import app


def test_health_without_external_services():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_chatbot_routes_are_not_exposed():
    with TestClient(app) as client:
        assert client.post("/api/v1/chat", json={"message": "hello"}).status_code == 404
        schema = client.get("/openapi.json").json()
        assert set(schema["paths"]) == {"/health"}


def test_allowed_web_origin():
    with TestClient(app) as client:
        response = client.options("/health", headers={
            "Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"
        })
        assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
