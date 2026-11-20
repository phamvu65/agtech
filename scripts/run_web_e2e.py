"""Run browser acceptance against a disposable schema in the dedicated test database."""

import os
import secrets
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.schema import CreateSchema, DropSchema

root = Path(__file__).resolve().parent.parent
base_url = os.environ["TEST_DATABASE_URL"]
schema = "e2e_" + uuid4().hex
engine = create_engine(base_url)
with engine.begin() as connection:
    connection.execute(CreateSchema(schema))
env = {**os.environ, "DATABASE_URL": make_url(base_url).update_query_dict(
    {"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False),
    "APP_ENV": "test", "CORS_ORIGINS": "http://localhost:3001", "E2E_PASSWORD": secrets.token_urlsafe(24),
    "PYTHON_EXECUTABLE": sys.executable}
try:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=root, env=env, check=True)
    subprocess.run([sys.executable, "-m", "src.manage", "create-admin", "--username", "admin-e2e", "--password-stdin"],
                   input=env["E2E_PASSWORD"] + "\n", text=True, cwd=root, env=env, check=True)
    result = subprocess.run(["npm.cmd" if os.name == "nt" else "npm", "run", "test:e2e"],
                            cwd=root / "web", env=env)
finally:
    with engine.begin() as connection:
        connection.execute(DropSchema(schema, cascade=True))
    engine.dispose()
sys.exit(result.returncode)
