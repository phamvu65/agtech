"""Recheck only the three G0 PDFs; never a production collector or rights grant.

Requires pypdf==6.6.0. Input PDFs stay in ignored data/research/.
"""

import argparse
import hashlib
import json
import platform
import re
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen

import pypdf

SAMPLES = [
    ('A', '2024/tuần/Báo cáo Cà phê _ số 46 (02-12-2024).pdf', 5,
     '33640989452d7e8e3d61fd5c7470b489795ccbf2e67431baa8d0efa18ffbc76e'),
    ('B', '2025/Tuần/Báo cáo Cà phê số 16_2025.pdf', 7,
     'eed713544f61fd9283365ce64989d75d5f0eb458df568c63067ff00417f20a88'),
    ('C', '2025/Tuần/Báo cáo Cà phê số 25_2025.pdf', 7,
     '7d2c985302ea868c8d96f395f4d73f6b4a5028d29954103e78b2f00929922cbf'),
]
BASE = 'https://thitruongnongsan.gov.vn/images/2013/DANGNHAP/VnSAT_Ca phe/'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fetch', action='store_true', help='Fetch these three public PDFs once; no crawling')
    parser.add_argument('--directory', type=Path, default=Path('data/research'))
    args = parser.parse_args()
    args.directory.mkdir(parents=True, exist_ok=True)
    result = {'checked_at': datetime.now(UTC).isoformat(), 'python': platform.python_version(),
              'pypdf': pypdf.__version__, 'rights_status': 'unknown', 'production_gate': 'no-go', 'samples': []}
    for key, remote, page, expected_hash in SAMPLES:
        path = args.directory / f'{key}.pdf'
        url = quote(BASE + remote, safe=':/')
        item = {'key': key, 'url': url, 'page': page}
        if args.fetch:
            with urlopen(url, timeout=30) as response:
                data = response.read(5_000_001)
                if len(data) > 5_000_000 or not data.startswith(b'%PDF'):
                    raise ValueError(f'{key}: not an expected bounded PDF response')
                item.update(http_status=response.status, last_modified=response.headers.get('Last-Modified'))
                path.write_bytes(data)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != expected_hash:
            raise ValueError(f'{key}: PDF changed ({digest}); re-review dates/table visually before profiling')
        text = pypdf.PdfReader(path).pages[page - 1].extract_text()
        rows = re.findall(r'((?:\d{2,3}\.\d{3}\s+){6})-?[\d.]+', text)
        if len(rows) != 17:
            raise ValueError(f'{key}: expected 17 locality rows; found {len(rows)}')
        item.update(sha256=digest, locality_rows=len(rows), daily_cells=len(rows) * 5)
        result['samples'].append(item)
    result['daily_cells'] = sum(item['daily_cells'] for item in result['samples'])
    result['distinct_days_per_locality'] = 15  # Five Mon-Fri columns in each of three disjoint report weeks.
    output = json.dumps(result, ensure_ascii=False, indent=2)
    (args.directory / 'recheck.json').write_text(output, encoding='utf-8')
    print(output)


if __name__ == '__main__':
    main()
