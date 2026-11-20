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
    try:
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True, capture_output=True)
        subprocess.run(
            [sys.executable, "-m", "src.manage", "create-admin", "--username", "admin", "--password-stdin"],
            input="Local-test-admin-2026!\n", text=True, check=True, capture_output=True,
        )
        with TestClient(create_app(Settings(_env_file=None, database_url=scoped, app_env="test"))) as client:
            yield client
    finally:
        with engine.begin() as conn:
            conn.execute(DropSchema(schema, cascade=True))
        engine.dispose()
