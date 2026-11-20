from tests.test_prices import ORIGIN, SERIES, admin


def test_reference_fixture_keeps_monthly_period_and_point_in_time_availability(auth_client):
    client = auth_client
    admin(client)
    series = client.post("/admin/price-series", json=SERIES, headers=ORIGIN).json()
    response = client.post(f"/admin/price-series/{series['id']}/reference-fixture", json={}, headers=ORIGIN)
    assert response.status_code == 201, response.text
    path = f"/price-series/{series['id']}/references?start=2025-06-23&end=2025-06-25"
    data = client.get(path).json()
    assert len(data["items"]) == 2
    monthly = next(item for item in data["items"] if item["kind"] == "international_monthly")
    assert monthly["period_start"] == "2025-06-01" and monthly["period_end"] == "2025-06-30"
    assert monthly["unit"] == "USD/kg" and monthly["dataset_kind"] == "synthetic"
    weather = next(item for item in data["items"] if item["kind"] == "weather_daily")
    assert weather["latitude"] == 12.7 and weather["product"] == "reanalysis_fixture"
    assert client.get(path + "&as_of=2025-06-24T00:00:00Z").json()["items"] == []
    assert len(client.get(path + "&as_of=2025-07-02T00:00:00Z").json()["items"]) == 2
    replay = client.post(f"/admin/price-series/{series['id']}/reference-fixture", json={}, headers=ORIGIN)
    assert replay.status_code == 201
    assert len(client.get(path).json()["items"]) == 2


def test_reference_errors_retries_and_original_document_are_auditable(auth_client):
    import json

    client = auth_client
    admin(client)
    series = client.post("/admin/price-series", json=SERIES, headers=ORIGIN).json()
    document = {
        "kind": "weather_daily",
        "source_name": "Synthetic",
        "source_url": "https://example.com/weather",
        "license": "Synthetic own data",
        "attribution": "AGTECH fixture",
        "dataset_kind": "synthetic",
        "records": [
            {
                "period_start": "2025-06-23",
                "period_end": "2025-06-23",
                "variable": "precipitation_sum",
                "value": "5",
                "unit": "mm",
                "latitude": 12.7,
                "longitude": 108.05,
                "product": "reanalysis_fixture",
            },
            {
                "period_start": "2025-06-24",
                "period_end": "2025-06-24",
                "variable": "precipitation_sum",
                "value": "-5",
                "unit": "mm",
                "latitude": 12.7,
                "longitude": 108.05,
                "product": "reanalysis_fixture",
            },
        ],
    }
    raw = json.dumps(document).encode()
    path = f"/admin/price-series/{series['id']}/reference-imports"
    report = client.post(path, content=raw, headers=ORIGIN).json()
    assert report["counts"] == {"valid": 1, "error": 1, "duplicate": 0, "conflict": 0}
    assert client.get(f"/admin/reference-imports/{report['id']}/file").content == raw
    assert client.get(f"/admin/reference-imports/{report['id']}").json()["errors"]
    assert client.post(path, content=raw, headers=ORIGIN).json()["counts"]["duplicate"] == 1
    document["records"][0]["value"] = "9"
    assert client.post(path, json=document, headers=ORIGIN).json()["counts"]["conflict"] == 1
    assert (
        client.get(
            f"/price-series/{series['id']}/references?start=2025-06-23&end=2025-06-25&as_of=2025-07-01T00:00:00Z"
        ).json()["items"]
        == []
    )


def test_reference_access_and_fixture_production_gate(auth_client):
    client = auth_client
    assert client.get("/price-series/1/references?start=2025-06-01&end=2025-06-30").status_code == 401
    admin(client)
    series = client.post("/admin/price-series", json=SERIES, headers=ORIGIN).json()
    assert client.post(f"/admin/price-series/{series['id']}/reference-fixture", json={}).status_code == 403
    client.app.state.settings.app_env = "production"
    assert (
        client.post(f"/admin/price-series/{series['id']}/reference-fixture", json={}, headers=ORIGIN).status_code == 409
    )
    client.app.state.settings.app_env = "test"
    credentials = {"username": "reference-reader", "password": "Observer-test-2026!"}
    client.post("/admin/users", json=credentials, headers=ORIGIN)
    token = client.post("/auth/login", json={**credentials, "transport": "bearer"}).json()["access_token"]
    bearer = {"Authorization": f"Bearer {token}"}
    assert (
        client.post(f"/admin/price-series/{series['id']}/reference-fixture", json={}, headers=bearer).status_code == 403
    )
    assert client.get("/admin/reference-imports/1", headers=bearer).status_code == 403


def test_reference_cannot_claim_availability_before_its_historical_period(auth_client):
    client = auth_client
    admin(client)
    series = client.post("/admin/price-series", json=SERIES, headers=ORIGIN).json()
    document = {
        "kind": "international_monthly",
        "source_name": "Fixture",
        "source_url": "https://example.com/month",
        "license": "Synthetic",
        "attribution": "AGTECH fixture",
        "dataset_kind": "synthetic",
        "records": [
            {
                "period_start": "2025-06-01",
                "period_end": "2025-06-30",
                "variable": "coffee_robusta",
                "value": "3",
                "unit": "USD/kg",
                "published_at": "2025-01-01T00:00:00Z",
                "available_at": "2025-01-01T00:00:00Z",
            }
        ],
    }
    response = client.post(f"/admin/price-series/{series['id']}/reference-imports", json=document, headers=ORIGIN)
    assert response.json()["counts"]["error"] == 1
    assert (
        client.get(
            f"/price-series/{series['id']}/references?start=2025-06-01&end=2025-06-30&as_of=2025-01-02T00:00:00Z"
        ).json()["items"]
        == []
    )
