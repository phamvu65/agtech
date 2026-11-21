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


def test_risk_validation_does_not_score_an_incomplete_seven_day_ground_truth(auth_client):
    from tests.test_analysis import seeded

    client = auth_client
    series = seeded(client, missing_index=15)
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
    policy = client.post(
        f"/admin/price-series/{series['id']}/risk-policies",
        json={
            "version": "diagnostic-fixture",
            "t1": "5",
            "t2": "10",
            "freshness_hours": "24",
            "anomaly_pct": "2",
            "recovery_mode": "pending",
        },
        headers=ORIGIN,
    ).json()
    diagnostic = client.post(
        "/admin/risk-validation", json={"backtest_id": report["id"], "policy_id": policy["id"]}, headers=ORIGIN
    )
    assert diagnostic.status_code == 201, diagnostic.text
    data = diagnostic.json()
    assert data["report"]["validation"]["scored_count"] == 0
    assert data["report"]["validation"]["incomplete_ground_truth"] == 3
    assert data["report"]["test"]["scored_count"] == 8
    assert data["report"]["test"]["false_alarm"] == 0 and data["report"]["test"]["miss"] == 0
    assert data["operational_eligible"] is False


def test_stale_fixture_is_unavailable_instead_of_low(auth_client):
    client = auth_client
    series, backtest = evaluated(client)
    policy = client.post(
        f"/admin/price-series/{series['id']}/risk-policies",
        json={
            "version": "stale-fixture",
            "t1": "5",
            "t2": "10",
            "freshness_hours": "24",
            "anomaly_pct": "2",
            "recovery_mode": "pending",
        },
        headers=ORIGIN,
    ).json()
    forecast = client.post(
        f"/admin/price-series/{series['id']}/forecast-fixture",
        json={"snapshot_id": backtest["snapshot_id"], "as_of": "2025-02-07T23:59:00Z", "prices": ["100340"] * 7},
        headers=ORIGIN,
    ).json()
    response = client.post(
        "/admin/risk-assessments",
        json={"forecast_id": forecast["id"], "policy_id": policy["id"], "idempotency_key": "stale"},
        headers=ORIGIN,
    ).json()
    assert response["status"] == "unavailable" and response["level"] is None and response["drop_pct"] is None


def test_alert_diagnostic_counts_misses_against_full_observed_windows(auth_client):
    from tests.test_analysis import seeded

    client = auth_client
    series = seeded(client, falling_after_train=True)
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
    policy = client.post(
        f"/admin/price-series/{series['id']}/risk-policies",
        json={
            "version": "miss-fixture",
            "t1": "1",
            "t2": "2",
            "freshness_hours": "24",
            "anomaly_pct": "2",
            "recovery_mode": "pending",
        },
        headers=ORIGIN,
    ).json()
    response = client.post(
        "/admin/risk-validation", json={"backtest_id": report["id"], "policy_id": policy["id"]}, headers=ORIGIN
    ).json()
    assert response["report"]["validation"]["scored_count"] == 3
    assert response["report"]["validation"]["miss"] == 3
    assert response["report"]["validation"]["false_alarm"] == 0
