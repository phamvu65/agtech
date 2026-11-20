"""Fixture-only HTTP connector; no network transport or external endpoint is enabled."""
import csv
import io
from datetime import datetime

import httpx

from src.prices import COLUMNS

FIXTURE_URL = 'https://fixtures.agtech.invalid/coffee-v1.csv'
FIXTURE = (','.join(COLUMNS) + '\n'
           '2025-06-23,95933,VND/kg,,2025-06-30T10:00:00Z,https://example.com/synthetic/week25\n'
           '2025-06-25,93733,VND/kg,2025-06-30T09:00:00Z,2025-06-30T10:00:00Z,https://example.com/synthetic/week25\n').encode()


def fetch_fixture(case: str) -> httpx.Response:
    def respond(request):
        if case == 'http_error':
            return httpx.Response(503, content=b'Synthetic upstream unavailable', request=request)
        raw = FIXTURE.replace(b'95933', b'-1') if case == 'invalid_csv' else FIXTURE
        return httpx.Response(200, content=raw, headers={'Content-Type': 'text/csv'}, request=request)
    with httpx.Client(transport=httpx.MockTransport(respond), timeout=10, follow_redirects=False) as client:
        return client.get(FIXTURE_URL)


def collected_csv(raw: bytes, fetched_at: datetime) -> bytes:
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), strict=True)
    if reader.fieldnames != COLUMNS:
        raise ValueError('HTTP CSV header does not match the data contract')
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=COLUMNS)
    writer.writeheader()
    for row in reader:
        row['collected_at'] = fetched_at.isoformat()
        writer.writerow(row)
    return output.getvalue().encode('utf-8')
