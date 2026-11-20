from tests.test_forecasts import evaluated
from tests.test_prices import ORIGIN


def test_fixture_risk_checks_threshold_boundaries_and_never_turns_missing_into_low(auth_client):
    client = auth_client
    series, backtest = evaluated(client)
    snapshot_id = backtest["snapshot_id"]
    policy = client.post(
        f"/admin/price-series/{series['id']}/risk-policies",
        json={
            "version": "fixture-v1",
            "t1": "5",
            "t2": "10",
            "freshness_hours": "24",
            "anomaly_pct": "0.001",
            "recovery_mode": "compare_last_valid",
        },
        headers=ORIGIN,
    )
    assert policy.status_code == 201, policy.text
    policy = policy.json()
    levels = []
    for index, price in enumerate(["100340", "95323", "90306"]):
        forecast = client.post(
            f"/admin/price-series/{series['id']}/forecast-fixture",
            json={"snapshot_id": snapshot_id, "as_of": "2025-02-04T23:59:00Z", "prices": [price] * 7},
            headers=ORIGIN,
        )
        assert forecast.status_code == 201, forecast.text
        body = {"forecast_id": forecast.json()["id"], "policy_id": policy["id"], "idempotency_key": f"risk-{index}"}
        response = client.post("/admin/risk-assessments", json=body, headers=ORIGIN)
        assert response.status_code == 201, response.text
        risk = response.json()
        levels.append(risk["level"])
        assert risk["anomaly"]["flag"] is True and risk["operational_eligible"] is False
        assert client.post("/admin/risk-assessments", json=body, headers=ORIGIN).json()["id"] == risk["id"]
    assert levels == ["LOW", "MEDIUM", "HIGH"]
    missing = client.post(
        f"/admin/price-series/{series['id']}/forecasts", json={"as_of": "2025-02-04T23:59:00Z"}, headers=ORIGIN
    ).json()
    unavailable = client.post(
        "/admin/risk-assessments",
        json={"forecast_id": missing["id"], "policy_id": policy["id"], "idempotency_key": "missing"},
        headers=ORIGIN,
    ).json()
    assert unavailable["level"] is None and unavailable["status"] == "unavailable"
