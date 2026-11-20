"""Collector acceptance uses synthetic HTTP responses and the public API/worker CLI."""
import subprocess
import sys

from tests.test_prices import ORIGIN, SERIES, admin


def worker():
    result = subprocess.run([sys.executable, '-m', 'src.worker', '--once'], text=True, capture_output=True, timeout=60)
    assert result.returncode == 0, result.stderr


def test_fixture_job_keeps_raw_and_import_audit_and_retry_does_not_duplicate(auth_client):
    client = auth_client
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    response = client.post('/admin/collector-sources', json={'series_id': series['id'], 'connector': 'fixture_csv'}, headers=ORIGIN)
    assert response.status_code == 201, response.text
    source = response.json()
    assert source['gate_status'] == 'fixture_only'
    queued = client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN)
    assert queued.status_code == 201, queued.text
    job_id = queued.json()['id']
    assert queued.json()['status'] == 'queued'
    worker()
    report = client.get(f'/admin/collector-jobs/{job_id}').json()
    assert report['status'] == 'succeeded', report
    assert report['counts'] == {'valid': 2, 'error': 0, 'duplicate': 0, 'conflict': 0}
    assert report['fetched_at'] is not None
    assert report['import_id'] is not None
    raw = client.get(f'/admin/collector-jobs/{job_id}/raw')
    assert raw.status_code == 200
    assert b'2025-06-23,95933' in raw.content
    assert client.get(f"/admin/imports/{report['import_id']}").json()['created_by'] == 'admin'
    replay = client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN).json()
    worker()
    assert client.get(f"/admin/collector-jobs/{replay['id']}").json()['counts'] == {
        'valid': 0, 'error': 0, 'duplicate': 2, 'conflict': 0}
    data = client.get(f"/price-series/{series['id']}/history?start=2025-06-23&end=2025-06-25").json()
    assert [row['price_vnd_per_kg'] for row in data['days']] == ['95933.00', None, '93733.00']
    assert data['series']['dataset_kind'] == 'synthetic'

def test_external_gate_and_production_gate_cannot_be_bypassed_by_manual_import_rights(auth_client, monkeypatch):
    client = auth_client
    admin(client)
    real_series = client.post('/admin/price-series', json={**SERIES, 'dataset_kind': 'authorized'}, headers=ORIGIN).json()
    source = client.post('/admin/collector-sources', json={'series_id': real_series['id'], 'connector': 'external'}, headers=ORIGIN).json()
    assert source['gate_status'] == 'blocked'
    job = client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN).json()
    assert job['status'] == 'blocked'
    assert job['error']
    assert client.get(f"/admin/collector-jobs/{job['id']}/raw").status_code == 404
    synthetic = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    fixture = client.post('/admin/collector-sources', json={'series_id': synthetic['id'], 'connector': 'fixture_csv'}, headers=ORIGIN).json()
    queued = client.post(f"/admin/collector-sources/{fixture['id']}/runs", json={}, headers=ORIGIN).json()
    monkeypatch.setenv('APP_ENV', 'production')
    worker()  # gate must be checked again by the worker, not only on enqueue
    report = client.get(f"/admin/collector-jobs/{queued['id']}").json()
    assert report['status'] == 'blocked'
    assert report['import_id'] is None
    assert client.get(f"/admin/collector-jobs/{queued['id']}/raw").status_code == 404

def test_http_and_csv_failures_are_retained_and_never_reported_as_success(auth_client):
    client = auth_client
    admin(client)
    for case in ['http_error', 'invalid_csv']:
        series = client.post('/admin/price-series', json={**SERIES, 'locality_code': case}, headers=ORIGIN).json()
        source = client.post('/admin/collector-sources', json={'series_id': series['id'], 'connector': 'fixture_csv',
                                                              'fixture_case': case}, headers=ORIGIN).json()
        job = client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN).json()
        worker()
        report = client.get(f"/admin/collector-jobs/{job['id']}").json()
        assert report['status'] == 'failed', report
        assert report['error']
        assert report['raw_sha256']
        assert client.get(f"/admin/collector-jobs/{job['id']}/raw").status_code == 200
        if case == 'http_error':
            assert report['http_status'] == 503
            assert report['import_id'] is None
        else:
            assert report['http_status'] == 200
            assert report['counts']['error'] == 1
        retried = client.post(f"/admin/collector-sources/{source['id']}/runs", json={'retry_of': job['id']}, headers=ORIGIN).json()
        assert retried['trigger'] == 'retry'
        assert retried['retry_of'] == job['id']
        worker()
        assert client.get(f"/admin/collector-jobs/{retried['id']}").json()['status'] == 'failed'

def test_scheduler_and_two_workers_do_not_overlap_or_duplicate_the_due_run(auth_client):
    from concurrent.futures import ThreadPoolExecutor

    client = auth_client
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    source = client.post('/admin/collector-sources', json={'series_id': series['id'], 'connector': 'fixture_csv'}, headers=ORIGIN).json()
    enabled = client.patch(f"/admin/collector-sources/{source['id']}", json={'enabled': True, 'interval_seconds': 60}, headers=ORIGIN)
    assert enabled.status_code == 200, enabled.text
    assert enabled.json()['enabled'] is True
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda _: worker(), range(2)))
    jobs = client.get(f"/admin/collector-jobs?source_id={source['id']}").json()
    assert jobs['total'] == 1
    assert jobs['items'][0]['trigger'] == 'scheduled'
    assert jobs['items'][0]['status'] == 'succeeded'
    worker()
    assert client.get(f"/admin/collector-jobs?source_id={source['id']}").json()['total'] == 1
    assert client.patch(f"/admin/collector-sources/{source['id']}", json={'enabled': False, 'interval_seconds': 60}, headers=ORIGIN).json()['next_run_at'] is None
    queued = client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN).json()
    assert queued['status'] == 'queued'
    assert client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN).status_code == 409
    assert client.post(f"/admin/collector-sources/{source['id']}/runs", json={'retry_of': queued['id']}, headers=ORIGIN).status_code == 409

def test_expired_worker_lease_is_interrupted_and_can_be_retried(auth_client):
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update
    from sqlalchemy.orm import Session

    from src.collector_models import CollectorJob

    client = auth_client
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    source = client.post('/admin/collector-sources', json={'series_id': series['id'], 'connector': 'fixture_csv'}, headers=ORIGIN).json()
    job = client.post(f"/admin/collector-sources/{source['id']}/runs", json={}, headers=ORIGIN).json()
    # Arrange an elapsed lease from a crashed worker; observe recovery only via API/CLI.
    with Session(client.app.state.engine) as db:
        db.execute(update(CollectorJob).where(CollectorJob.id == job['id']).values(
            status='running', started_at=datetime.now(UTC) - timedelta(minutes=5),
            lease_token='expired-worker', lease_expires_at=datetime.now(UTC) - timedelta(minutes=1)))
        db.commit()
    worker()
    recovered = client.get(f"/admin/collector-jobs/{job['id']}").json()
    assert recovered['status'] == 'interrupted'
    assert recovered['error']
    assert recovered['import_id'] is None
    retry = client.post(f"/admin/collector-sources/{source['id']}/runs", json={'retry_of': job['id']}, headers=ORIGIN).json()
    assert retry['trigger'] == 'retry'
    worker()
    assert client.get(f"/admin/collector-jobs/{retry['id']}").json()['counts']['valid'] == 2

def test_collector_controls_and_audits_are_admin_only_and_source_gate_stays_closed(auth_client):
    client = auth_client
    assert client.get('/admin/collector-sources').status_code == 401
    assert client.get('/admin/collector-jobs').status_code == 401
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    source = client.post('/admin/collector-sources', json={'series_id': series['id'], 'connector': 'external'}, headers=ORIGIN).json()
    path = f"/admin/collector-sources/{source['id']}"
    assert client.patch(path, json={'enabled': True, 'interval_seconds': 60}, headers=ORIGIN).status_code == 409
    assert client.patch(path, json={'enabled': False, 'interval_seconds': 1}, headers=ORIGIN).status_code == 422
    assert client.post(path + '/runs', json={}).status_code == 403
    blocked = client.post(path + '/runs', json={}, headers=ORIGIN).json()
    assert blocked['status'] == 'blocked'
    assert client.post(path + '/runs', json={'retry_of': blocked['id']}, headers=ORIGIN).status_code == 409
    assert client.get('/admin/collector-jobs?offset=-1').status_code == 422
    assert client.get('/admin/collector-jobs?limit=1').json()['total'] == 1
    credentials = {'username': 'collector-reader', 'password': 'Observer-test-2026!'}
    client.post('/admin/users', json=credentials, headers=ORIGIN)
    token = client.post('/auth/login', json={**credentials, 'transport': 'bearer'}).json()['access_token']
    bearer = {'Authorization': f'Bearer {token}'}
    for route in ['/admin/collector-sources', '/admin/collector-jobs',
                  f"/admin/collector-jobs/{blocked['id']}", f"/admin/collector-jobs/{blocked['id']}/raw"]:
        assert client.get(route, headers=bearer).status_code == 403
    assert client.post(path + '/runs', json={}, headers=bearer).status_code == 403
    assert client.patch(path, json={'enabled': False}, headers=bearer).status_code == 403
