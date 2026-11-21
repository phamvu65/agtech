from tests.test_analysis import seeded
from tests.test_prices import ORIGIN


def evaluated(client):
    series = seeded(client)
    snapshot = client.post(f"/admin/price-series/{series['id']}/snapshots", json={}, headers=ORIGIN).json()
    report = client.post(
        "/admin/backtests",
        json={
            "snapshot_id": snapshot["id"],
            "train_end": "2025-01-10",
            "validation_end": "2025-01-20",
            "test_end": "2025-02-04",
            "mode": "fixture",
        },
        headers=ORIGIN,
    ).json()
    return series, report


def test_forecast_has_seven_next_calendar_days_and_never_promotes_fixture_model(auth_client):
    client = auth_client
    series, report = evaluated(client)
    path = f"/admin/price-series/{series['id']}/forecasts"
    blocked = client.post(path, json={"as_of": "2025-02-04T23:59:00Z"}, headers=ORIGIN)
    assert blocked.status_code == 201, blocked.text
    assert blocked.json()["status"] == "unavailable" and blocked.json()["predictions"] == []
    response = client.post(
        path, json={"as_of": "2025-02-04T23:59:00Z", "mode": "fixture", "backtest_id": report["id"]}, headers=ORIGIN
    )
    assert response.status_code == 201, response.text
    forecast = response.json()
    assert forecast["status"] == "fixture" and forecast["operational_eligible"] is False
    assert [item["date"] for item in forecast["predictions"]] == [
        "2025-02-05",
        "2025-02-06",
        "2025-02-07",
        "2025-02-08",
        "2025-02-09",
        "2025-02-10",
        "2025-02-11",
    ]
    assert forecast["data_as_of"] == "2025-02-04" and forecast["model_version"] == "linear_time_v1"
    assert forecast["evaluation"]["metrics"]["test"]["7"]["target_count"] == 8
    assert forecast["evaluation"]["fixture_only"] is True
    assert client.get(f"/forecasts/{forecast['id']}").json() == forecast
    assert client.get(f"/price-series/{series['id']}/forecasts/latest").json()["id"] == forecast["id"]
    client.app.state.settings.app_env = "production"
    assert (
        client.post(
            path, json={"as_of": "2025-02-04T23:59:00Z", "mode": "fixture", "backtest_id": report["id"]}, headers=ORIGIN
        ).status_code
        == 409
    )
