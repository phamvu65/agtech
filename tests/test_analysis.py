from datetime import date, timedelta
from decimal import Decimal

from tests.test_prices import HEADER, ORIGIN, SERIES, admin


def seeded(client, missing_index=None):
    admin(client)
    series = client.post("/admin/price-series", json={**SERIES, "locality_code": "ANALYSIS"}, headers=ORIGIN).json()
    rows = []
    for index in range(35):
        if index == missing_index:
            continue
        day = date(2025, 1, 1) + timedelta(days=index)
        published = "2025-01-15" if index == 0 else day.isoformat()
        rows.append(
            f"{day},{100000 + 10 * index},VND/kg,{published}T08:00:00Z,{published}T09:00:00Z,https://example.com/synthetic/analysis\n"
        )
    result = client.post(
        f"/admin/price-series/{series['id']}/imports", content=(HEADER + "".join(rows)).encode(), headers=ORIGIN
    )
    assert result.json()["counts"]["valid"] == 35 - int(missing_index is not None)
    return series


def test_snapshot_and_backtest_respect_publication_splits_and_common_observed_targets(auth_client):
    client = auth_client
    series = seeded(client)
    snapshot = client.post(f"/admin/price-series/{series['id']}/snapshots", json={}, headers=ORIGIN)
    assert snapshot.status_code == 201, snapshot.text
    snapshot = snapshot.json()
    config = {
        "snapshot_id": snapshot["id"],
        "train_end": "2025-01-10",
        "validation_end": "2025-01-20",
        "test_end": "2025-02-04",
    }
    blocked = client.post("/admin/backtests", json={**config, "mode": "official"}, headers=ORIGIN).json()
    assert blocked["status"] == "blocked" and blocked["reasons"]
    report = client.post("/admin/backtests", json={**config, "mode": "fixture"}, headers=ORIGIN)
    assert report.status_code == 201, report.text
    report = report.json()
    assert report["status"] == "fixture_evaluated" and report["operational_eligible"] is False
    assert report["artifact"]["training_count"] == 9  # Jan1 published after training cutoff
    metrics = report["metrics"]["validation"]
    assert metrics["1"]["target_count"] == 9
    assert metrics["7"]["target_count"] == 3
    assert Decimal(metrics["7"]["baseline_mae"]) == 70
    assert Decimal(metrics["7"]["model_mae"]) == 0
    stored = client.get(f"/admin/snapshots/{snapshot['id']}").json()
    assert stored["sha256"] == snapshot["sha256"] and len(stored["payload"]["observations"]) == 35
    client.post(
        f"/admin/price-series/{series['id']}/imports",
        content=(
            HEADER
            + "2025-02-05,100350,VND/kg,2025-02-05T08:00:00Z,2025-02-05T09:00:00Z,https://example.com/synthetic/analysis\n"
        ).encode(),
        headers=ORIGIN,
    )
    assert client.get(f"/admin/snapshots/{snapshot['id']}").json() == stored
    assert client.get(f"/admin/backtests/{report['id']}").json() == report


def test_backtest_reports_missing_targets_without_imputing_or_crossing_splits(auth_client):
    client = auth_client
    series = seeded(client, missing_index=15)
    snapshot = client.post(f"/admin/price-series/{series['id']}/snapshots", json={}, headers=ORIGIN).json()
    config = {
        "snapshot_id": snapshot["id"],
        "train_end": "2025-01-10",
        "validation_end": "2025-01-20",
        "test_end": "2025-02-04",
        "mode": "fixture",
    }
    report = client.post("/admin/backtests", json=config, headers=ORIGIN).json()
    metric = report["metrics"]["validation"]["1"]
    assert metric["target_count"] == 8 and metric["expected_targets"] == 9 and metric["missing_targets"] == 1
    assert Decimal(metric["baseline_mae"]) == Decimal("11.25")
    assert (
        client.post("/admin/backtests", json={**config, "validation_end": "2025-01-09"}, headers=ORIGIN).status_code
        == 422
    )
    client.app.state.settings.app_env = "production"
    assert client.post("/admin/backtests", json=config, headers=ORIGIN).status_code == 409
