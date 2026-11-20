import os
import subprocess
import sys
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.schema import CreateSchema, DropSchema

from src.config import Settings
from src.main import create_app


@pytest.fixture
def auth_client(monkeypatch):
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.fail("Set TEST_DATABASE_URL to a dedicated PostgreSQL test database")
    schema = "test_" + uuid4().hex
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(CreateSchema(schema))
    scoped = make_url(url).update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)
    monkeypatch.setenv("DATABASE_URL", scoped)
    monkeypatch.setenv("APP_ENV", "test")
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, capture_output=True)
    subprocess.run(
        [sys.executable, "-m", "src.manage", "create-admin", "--username", "admin", "--password-stdin"],
        input="Local-test-admin-2026!\n", text=True, check=True, capture_output=True,
    )
    try:
        with TestClient(create_app(Settings(_env_file=None, database_url=scoped, app_env="test"))) as client:
            yield client
    finally:
        with engine.begin() as conn:
            conn.execute(DropSchema(schema, cascade=True))
        engine.dispose()


def test_admin_can_login_and_logout_revokes_the_session(auth_client):
    client = auth_client
    assert client.get("/auth/me").status_code == 401
    response = client.post("/auth/login", json={"username": "admin", "password": "Local-test-admin-2026!"})
    assert response.status_code == 200
    assert response.json() == {"username": "admin", "role": "admin"}
    assert "httponly" in response.headers["set-cookie"].lower()
    token = client.cookies.get("agtech_session")
    assert client.get("/auth/me").json()["role"] == "admin"
    assert client.post("/auth/logout", headers={"Origin": "http://localhost:3000"}).status_code == 204
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_only_admin_manages_accounts_and_disabling_revokes_access(auth_client):
    client = auth_client
    credentials = {"username": "reader", "password": "Observer-test-2026!", "role": "observer"}
    assert client.post("/admin/users", json=credentials).status_code == 401
    client.post("/auth/login", json={"username": "admin", "password": "Local-test-admin-2026!"})
    origin = {"Origin": "http://localhost:3000"}
    assert client.post("/admin/users", json=credentials).status_code == 403  # cookie write needs origin
    response = client.post("/admin/users", json=credentials, headers=origin)
    assert response.status_code == 201
    user_id = response.json()["id"]
    assert "password" not in response.text
    assert client.post("/admin/users", json=credentials, headers=origin).status_code == 409
    observer = client.post("/auth/login", json={**credentials, "transport": "bearer"}).json()["access_token"]
    bearer = {"Authorization": f"Bearer {observer}"}
    assert client.get("/admin/users", headers=bearer).status_code == 403
    assert client.get("/auth/me", headers=bearer).json()["role"] == "observer"
    assert client.patch(f"/admin/users/{user_id}", json={"active": False}, headers=origin).status_code == 200
    assert client.get("/auth/me", headers=bearer).status_code == 401
    assert client.post("/auth/login", json=credentials).status_code == 401


def test_credentials_and_cross_origin_requests_are_rejected(auth_client):
    client = auth_client
    for username in ["admin", "missing"]:
        response = client.post("/auth/login", json={"username": username, "password": "incorrect"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid username or password"
    assert client.post("/auth/login", json={"username": "admin", "password": "Local-test-admin-2026!"},
                       headers={"Origin": "https://untrusted.example"}).status_code == 403
    assert client.get("/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
