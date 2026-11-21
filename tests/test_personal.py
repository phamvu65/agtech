from tests.test_forecasts import evaluated
from tests.test_prices import ORIGIN


def test_followers_receive_only_risk_changes_and_private_read_state_is_isolated(auth_client):
    client = auth_client
    series, backtest = evaluated(client)
    assert client.post("/me/followings", json={"series_id": series["id"]}, headers=ORIGIN).status_code == 201
    policy = client.post(
        f"/admin/price-series/{series['id']}/risk-policies",
        json={
            "version": "notify-fixture",
            "t1": "5",
            "t2": "10",
            "freshness_hours": "24",
            "anomaly_pct": "2",
            "recovery_mode": "compare_last_valid",
        },
        headers=ORIGIN,
    ).json()
    for index, price in enumerate(["100340", "95323", "90306", "90306", "100340"]):
        forecast = client.post(
            f"/admin/price-series/{series['id']}/forecast-fixture",
            json={"snapshot_id": backtest["snapshot_id"], "as_of": "2025-02-04T23:59:00Z", "prices": [price] * 7},
            headers=ORIGIN,
        ).json()
        body = {"forecast_id": forecast["id"], "policy_id": policy["id"], "idempotency_key": f"notify-{index}"}
        assert client.post("/admin/risk-assessments", json=body, headers=ORIGIN).status_code == 201
        assert client.post("/admin/risk-assessments", json=body, headers=ORIGIN).status_code == 201
    inbox = client.get("/me/notifications").json()
    assert inbox["total"] == 3 and inbox["unread_count"] == 3
    assert [item["level"] for item in inbox["items"]] == ["LOW", "HIGH", "MEDIUM"]
    notification_id = inbox["items"][0]["id"]
    assert client.patch(f"/me/notifications/{notification_id}", json={"read": True}, headers=ORIGIN).json()["read_at"]
    assert client.get("/me/notifications").json()["unread_count"] == 2
    other = {"username": "other-reader", "password": "Observer-test-2026!"}
    client.post("/admin/users", json=other, headers=ORIGIN)
    bearer = {
        "Authorization": "Bearer "
        + client.post("/auth/login", json={**other, "transport": "bearer"}).json()["access_token"]
    }
    assert client.get("/me/notifications", headers=bearer).json()["total"] == 0
    assert client.patch(f"/me/notifications/{notification_id}", json={"read": True}, headers=bearer).status_code == 404
    assert client.get("/me/followings", headers=bearer).json()["total"] == 0
    assert client.delete(f"/me/followings/{series['id']}", headers=bearer).status_code == 204
    assert client.get("/me/followings").json()["total"] == 1
    assert client.delete(f"/me/followings/{series['id']}", headers=ORIGIN).status_code == 204
    assert client.get("/me/followings").json()["total"] == 0


def test_pending_recovery_does_not_invent_restore_notifications(auth_client):
    client = auth_client
    series, backtest = evaluated(client)
    client.post("/me/followings", json={"series_id": series["id"]}, headers=ORIGIN)
    policy = client.post(
        f"/admin/price-series/{series['id']}/risk-policies",
        json={
            "version": "pending-fixture",
            "t1": "5",
            "t2": "10",
            "freshness_hours": "24",
            "anomaly_pct": "2",
            "recovery_mode": "pending",
        },
        headers=ORIGIN,
    ).json()
    for index, price in enumerate(["95323", None, "90306"]):
        if price:
            forecast = client.post(
                f"/admin/price-series/{series['id']}/forecast-fixture",
                json={"snapshot_id": backtest["snapshot_id"], "as_of": "2025-02-04T23:59:00Z", "prices": [price] * 7},
                headers=ORIGIN,
            ).json()
        else:
            forecast = client.post(
                f"/admin/price-series/{series['id']}/forecasts", json={"as_of": "2025-02-04T23:59:00Z"}, headers=ORIGIN
            ).json()
        response = client.post(
            "/admin/risk-assessments",
            json={"forecast_id": forecast["id"], "policy_id": policy["id"], "idempotency_key": f"pending-{index}"},
            headers=ORIGIN,
        ).json()
    assert response["notification_decision"] == "recovery_policy_pending"
    assert client.get("/me/notifications").json()["total"] == 1
