"""Local TLS, permissions, latency and real restore drill; dedicated test cluster only."""

import argparse
import hashlib
import json
import os
import platform
import secrets
import shutil
import ssl
import statistics
import subprocess
import sys
import time
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import httpx
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.schema import CreateSchema, DropSchema

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def run(args, env=None, stdin=None):
    result = subprocess.run(args, env=env, cwd=ROOT, input=stdin, text=True, capture_output=True)
    if result.returncode:
        # Do not echo connection strings, server stderr or credential-bearing environment.
        raise RuntimeError(f"{Path(str(args[0])).name} failed (exit {result.returncode}); inspect locally")
    return result.stdout


def verify(args):
    url = make_url(os.environ["TEST_DATABASE_URL"])
    if url.host not in {"localhost", "127.0.0.1", "::1"} or not (url.database or "").endswith("_test"):
        raise ValueError("Only a loopback dedicated *_test database is allowed")
    schema = "ops_" + uuid4().hex
    restore_name = "agtech_restore_" + uuid4().hex
    output = (ROOT / "data" / "operations" / schema).resolve()
    output.mkdir(parents=True)
    engine = create_engine(url)
    scoped = url.update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)
    env = {**os.environ, "DATABASE_URL": scoped, "APP_ENV": "test"}
    pg_env = {
        **os.environ,
        "PGHOST": url.host,
        "PGPORT": str(url.port or 5432),
        "PGUSER": url.username or "",
        "PGDATABASE": url.database,
        "PGPASSWORD": url.password or "",
    }

    def pg(name):
        return str(Path(args.pg_bin) / (name + (".exe" if os.name == "nt" else "")))

    server = None
    restored = False
    password = secrets.token_urlsafe(30)
    # Local engineering budget, declared before measurement; not a production SLO.
    report = {
        "started_at": datetime.now(UTC).isoformat(),
        "platform": platform.platform(),
        "scope": "local synthetic, one user, 20 sequential HTTPS history requests; no load claim",
        "local_budget_ms": {"history_p95": 1000},
        "schema": schema,
        "public_deployment": False,
        "ios_native": False,
    }
    try:
        with engine.begin() as conn:
            conn.execute(CreateSchema(schema))
        run([sys.executable, "-m", "alembic", "upgrade", "head"], env)
        run(
            [sys.executable, "-m", "src.manage", "create-admin", "--username", "ops-admin", "--password-stdin"],
            env,
            password + "\n",
        )
        # Test-only TLS key remains under ignored data/, never installs a trust root.
        cert, key = output / "localhost.crt", output / "localhost.key"
        run(
            [
                args.openssl,
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-days",
                "2",
                "-keyout",
                str(key),
                "-out",
                str(cert),
                "-subj",
                "/CN=localhost",
                "-addext",
                "subjectAltName=DNS:localhost,IP:127.0.0.1",
            ]
        )
        log = (output / "server.log").open("w", encoding="utf-8")
        server = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "src.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.port),
                "--ssl-certfile",
                str(cert),
                "--ssl-keyfile",
                str(key),
            ],
            cwd=ROOT,
            env={**env, "APP_ENV": "production"},
            stdout=log,
            stderr=log,
        )
        base = f"https://localhost:{args.port}"
        context = ssl.create_default_context(cafile=str(cert))
        with httpx.Client(base_url=base, verify=context, timeout=15) as client:
            for _ in range(60):
                try:
                    if client.get("/health").status_code == 200:
                        break
                except httpx.TransportError:
                    pass
                if server.poll() is not None:
                    raise RuntimeError("TLS server exited")
                time.sleep(0.5)
            else:
                raise RuntimeError("TLS server did not become ready")
            assert client.get("/price-series").status_code == 401
            cookie_login = client.post("/auth/login", json={"username": "ops-admin", "password": password})
            assert cookie_login.status_code == 200
            assert "; Secure" in cookie_login.headers["set-cookie"] and "HttpOnly" in cookie_login.headers["set-cookie"]
            client.cookies.clear()
            login = client.post(
                "/auth/login", json={"username": "ops-admin", "password": password, "transport": "bearer"}
            )
            login.raise_for_status()
            client.headers["Authorization"] = "Bearer " + login.json()["access_token"]
            series = client.post(
                "/admin/price-series",
                json={
                    "commodity": "Coffee operations fixture",
                    "locality_code": "OPS",
                    "locality_name": "Local restore drill",
                    "quality": "synthetic",
                    "source_name": "Self-created",
                    "source_url": "https://example.com/ops-fixture",
                    "dataset_kind": "synthetic",
                    "rights_basis": "Self-created synthetic operations fixture",
                },
            )
            series.raise_for_status()
            series_id = series.json()["id"]
            csv = "observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url\n"
            for i in range(365):
                day = date(2025, 1, 1) + timedelta(days=i)
                csv += f"{day},{100000 + i},VND/kg,{day}T08:00:00Z,{day}T09:00:00Z,https://example.com/ops-fixture\n"
            imported = client.post(
                f"/admin/price-series/{series_id}/imports", content=csv.encode(), headers={"Content-Type": "text/csv"}
            )
            imported.raise_for_status()
            assert imported.json()["counts"]["valid"] == 365
            assert client.post(f"/admin/price-series/{series_id}/reference-fixture", json={}).status_code == 409
            path = f"/price-series/{series_id}/history?start=2025-01-01&end=2025-12-31"
            expected = client.get(path).json()
            assert len(expected["days"]) == 365
            timings = []
            for _ in range(20):
                started = time.perf_counter()
                response = client.get(path)
                response.raise_for_status()
                assert response.json() == expected
                timings.append((time.perf_counter() - started) * 1000)
            p95 = sorted(timings)[18]
            report.update(
                tls_verified=True,
                unauthorized_401=True,
                secure_cookie=True,
                fixture_production_blocked=True,
                history={
                    "observations": 365,
                    "requests": 20,
                    "p50_ms": statistics.median(timings),
                    "p95_ms": p95,
                    "budget_met": p95 <= 1000,
                },
            )
            backup = output / "backup.dump"
            run([pg("pg_dump"), "--format=custom", "--no-owner", "--schema", schema, "--file", str(backup)], pg_env)
            report["backup_sha256"] = hashlib.sha256(backup.read_bytes()).hexdigest()
            run([pg("createdb"), restore_name], pg_env)
            restored = True
            run([pg("pg_restore"), "--exit-on-error", "--no-owner", "--dbname", restore_name, str(backup)], pg_env)
            restore_url = url.set(database=restore_name).update_query_dict({"options": f"-csearch_path={schema}"})
            # Verify restored state through the same public application API.
            from fastapi.testclient import TestClient

            from src.config import Settings
            from src.main import create_app

            with TestClient(
                create_app(
                    Settings(
                        _env_file=None, database_url=restore_url.render_as_string(hide_password=False), app_env="test"
                    )
                )
            ) as restored_client:
                restored_login = restored_client.post(
                    "/auth/login", json={"username": "ops-admin", "password": password, "transport": "bearer"}
                )
                restored_login.raise_for_status()
                restored_client.headers["Authorization"] = "Bearer " + restored_login.json()["access_token"]
                assert restored_client.get(path).json() == expected
                assert restored_client.get(f"/admin/imports/{imported.json()['id']}/file").content == csv.encode()
            assert client.post("/auth/logout").status_code == 204
            assert client.get("/price-series").status_code == 401
            report["restore_verified"] = {
                "history_matches": True,
                "original_bytes_match": True,
                "login_after_restore": True,
            }
        report["completed_at"] = datetime.now(UTC).isoformat()
        (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps({"report": str(output / "report.json"), **report}, indent=2))
    finally:
        if server:
            server.terminate()
            server.wait(timeout=15)
            log.close()
        if restored:
            # Only the unique DB this process successfully created is eligible for removal.
            run([pg("dropdb"), restore_name], pg_env)
        with engine.begin() as conn:
            conn.execute(DropSchema(schema, cascade=True, if_exists=True))
        engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pg-bin", default="C:/Program Files/PostgreSQL/18/bin" if os.name == "nt" else "/usr/bin")
    parser.add_argument("--openssl", default=shutil.which("openssl") or "C:/Program Files/Git/usr/bin/openssl.exe")
    parser.add_argument("--port", type=int, default=8443)
    verify(parser.parse_args())
