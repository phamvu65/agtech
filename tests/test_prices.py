"""Synthetic data tests software behavior, never source rights or AI quality."""

SERIES = {
    "commodity": "Cà phê nhân", "locality_code": "TEST-DL", "locality_name": "Địa bàn thử nghiệm",
    "quality": "unspecified", "source_name": "Fixture tự tạo", "source_url": "https://example.com/fixture",
    "dataset_kind": "synthetic", "rights_basis": "Tự tạo để kiểm thử phần mềm, không phải giá thị trường",
}
HEADER = "observed_on,price_vnd_per_kg,unit,published_at,collected_at,source_document_url\n"
ROW = "2025-06-23,95933,VND/kg,,2025-06-30T10:00:00Z,https://example.com/fixture/week25\n"
ORIGIN = {"Origin": "http://localhost:3000"}


def admin(client):
    assert client.post("/auth/login", json={"username": "admin", "password": "Local-test-admin-2026!"}).status_code == 200


def test_admin_imports_auditable_price_and_history_marks_calendar_gaps(auth_client):
    client = auth_client
    admin(client)
    response = client.post("/admin/price-series", json=SERIES, headers=ORIGIN)
    assert response.status_code == 201, response.text
    series = response.json()
    imported = client.post(f"/admin/price-series/{series['id']}/imports?filename=fixture.csv",
                           content=(HEADER + ROW).encode(), headers={**ORIGIN, "Content-Type": "text/csv"})
    assert imported.status_code == 201, imported.text
    report = imported.json()
    assert report["counts"] == {"valid": 1, "error": 0, "duplicate": 0, "conflict": 0}
    assert report["created_by"] == "admin"
    assert client.get(f"/admin/imports/{report['id']}/file").content == (HEADER + ROW).encode()
    assert client.get(f"/admin/imports/{report['id']}").json() == report
    history = client.get(f"/price-series/{series['id']}/history?start=2025-06-23&end=2025-06-25")
    assert history.status_code == 200, history.text
    data = history.json()
    assert data["series"]["dataset_kind"] == "synthetic"
    assert data["series"]["quality"] == "unspecified"
    assert data["days"][0]["price_vnd_per_kg"] == "95933.00"
    assert data["days"][0]["published_at"] is None
    assert data["days"][0]["import_id"] == report["id"]
    assert data["days"][1] == {"observed_on": "2025-06-24", "price_vnd_per_kg": None}
    assert data["days"][2] == {"observed_on": "2025-06-25", "price_vnd_per_kg": None}

def test_import_quarantines_errors_conflicts_and_retry_does_not_duplicate(auth_client):
    client = auth_client
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    csv = HEADER + ROW + ROW + ROW.replace('95933', '97000') + ROW.replace('VND/kg', 'USD/kg')
    csv += ROW.replace('2025-06-23', 'not-a-date') + ROW.replace('95933', '-1')
    path = f"/admin/price-series/{series['id']}/imports"
    report = client.post(path, content=csv.encode(), headers=ORIGIN).json()
    assert report['counts'] == {'valid': 1, 'duplicate': 1, 'conflict': 1, 'error': 3}
    assert [row['status'] for row in report['rows']] == ['valid', 'duplicate', 'conflict', 'error', 'error', 'error']
    replay = client.post(path, content=csv.encode(), headers=ORIGIN).json()
    assert replay['counts'] == {'valid': 0, 'duplicate': 2, 'conflict': 1, 'error': 3}
    assert replay['id'] != report['id']  # each attempt is audited, observations stay immutable
    history = client.get(f"/price-series/{series['id']}/history?start=2025-06-23&end=2025-06-23").json()
    assert history['days'][0]['price_vnd_per_kg'] == '95933.00'
    assert history['days'][0]['import_id'] == report['id']
    assert client.get(f"/admin/imports/{replay['id']}/file").content == csv.encode()

def test_bad_csv_and_impossible_times_are_audited_without_entering_history(auth_client):
    client = auth_client
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    path = f"/admin/price-series/{series['id']}/imports"
    for original in [b'not,the,template\n1,2,3\n', b'\xff\xfe']:
        response = client.post(path, content=original, headers=ORIGIN)
        assert response.status_code == 201, response.text
        assert response.json()['counts'] == {'valid': 0, 'duplicate': 0, 'conflict': 0, 'error': 1}
        assert client.get(f"/admin/imports/{response.json()['id']}/file").content == original
    rows = ROW.replace('2025-06-30T10:00:00Z', '2025-06-30T10:00:00')
    rows += ROW.replace('2025-06-23', '2025-07-01')  # observation after collection
    rows += ROW.replace('VND/kg,,', 'VND/kg,2025-07-01T00:00:00Z,')  # publication after collection
    rows += ROW.replace('95933', 'NaN')
    rows += ROW.strip() + ',extra\n'
    report = client.post(path, content=(HEADER + rows).encode(), headers=ORIGIN).json()
    assert report['counts'] == {'valid': 0, 'duplicate': 0, 'conflict': 0, 'error': 5}
    assert all(row['errors'] for row in report['rows'])
    assert client.post(path, content=b'x' * 2_000_001, headers=ORIGIN).status_code == 413
    history = client.get(f"/price-series/{series['id']}/history?start=2025-06-23&end=2025-06-23").json()
    assert history['days'] == [{'observed_on': '2025-06-23', 'price_vnd_per_kg': None}]

def test_price_reads_require_login_and_import_audit_is_admin_only(auth_client):
    client = auth_client
    assert client.get('/price-series').status_code == 401
    assert client.post('/admin/price-series', json=SERIES).status_code == 401
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    path = f"/admin/price-series/{series['id']}/imports"
    assert client.post(path, content=(HEADER + ROW).encode()).status_code == 403
    imported = client.post(path, content=(HEADER + ROW).encode(), headers=ORIGIN).json()
    credentials = {'username': 'reader', 'password': 'Observer-test-2026!'}
    assert client.post('/admin/users', json=credentials, headers=ORIGIN).status_code == 201
    token = client.post('/auth/login', json={**credentials, 'transport': 'bearer'}).json()['access_token']
    bearer = {'Authorization': f'Bearer {token}'}
    for route in [path, '/admin/price-series']:
        assert client.post(route, content=b'', headers=bearer).status_code == 403
    assert client.get(f"/admin/imports/{imported['id']}", headers=bearer).status_code == 403
    assert client.get(f"/admin/imports/{imported['id']}/file", headers=bearer).status_code == 403
    assert client.get('/price-series', headers=bearer).json()[0]['id'] == series['id']
    assert client.get(f"/price-series/{series['id']}/history?start=2025-06-23&end=2025-06-23", headers=bearer).status_code == 200


def test_history_keeps_series_separate_and_validates_filter_range(auth_client):
    client = auth_client
    admin(client)
    first = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    assert client.post('/admin/price-series', json=SERIES, headers=ORIGIN).status_code == 409
    assert client.post('/admin/price-series', json={**SERIES, 'source_name': '   '}, headers=ORIGIN).status_code == 422
    second = client.post('/admin/price-series', json={**SERIES, 'quality': 'Khác chất lượng'}, headers=ORIGIN).json()
    client.post(f"/admin/price-series/{first['id']}/imports", content=(HEADER + ROW).encode(), headers=ORIGIN)
    history = client.get(f"/price-series/{second['id']}/history?start=2025-06-23&end=2025-06-23").json()
    assert history['days'] == [{'observed_on': '2025-06-23', 'price_vnd_per_kg': None}]
    path = f"/price-series/{first['id']}/history"
    assert client.get(path + '?start=2025-06-24&end=2025-06-23').status_code == 422
    assert client.get(path + '?start=2020-01-01&end=2025-06-23').status_code == 422
    assert client.get('/price-series/9999/history?start=2025-06-23&end=2025-06-23').status_code == 404

def test_simultaneous_imports_create_only_one_observation(auth_client):
    from concurrent.futures import ThreadPoolExecutor

    client = auth_client
    admin(client)
    series = client.post('/admin/price-series', json=SERIES, headers=ORIGIN).json()
    token = client.post('/auth/login', json={'username': 'admin', 'password': 'Local-test-admin-2026!',
                                           'transport': 'bearer'}).json()['access_token']
    def upload(_):
        return client.post(f"/admin/price-series/{series['id']}/imports", content=(HEADER + ROW).encode(),
                           headers={'Authorization': f'Bearer {token}'})
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(upload, range(2)))
    assert [response.status_code for response in responses] == [201, 201]
    reports = [response.json() for response in responses]
    assert sorted(report['counts']['valid'] for report in reports) == [0, 1]
    assert sorted(report['counts']['duplicate'] for report in reports) == [0, 1]
