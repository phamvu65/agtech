"""Run durable collector jobs independently of API processes."""
import argparse
import csv
import hashlib
import time
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
from sqlalchemy import create_engine, or_, select
from sqlalchemy.orm import Session

from src.collector_http import collected_csv, fetch_fixture
from src.collector_models import CollectorJob, CollectorSource
from src.collectors import event, source_gate
from src.config import Settings
from src.price_models import PriceSeries
from src.prices import record_price_import


def schedule_due(engine, settings):
    now = datetime.now(UTC)
    with Session(engine) as db:
        sources = list(db.scalars(select(CollectorSource).where(CollectorSource.enabled.is_(True),
                                   CollectorSource.next_run_at <= now).order_by(CollectorSource.id)
                                   .with_for_update(skip_locked=True).limit(100)))
        for source in sources:
            active = db.scalar(select(CollectorJob.id).where(CollectorJob.source_id == source.id,
                                    CollectorJob.status.in_(['queued', 'running'])))
            if active:
                continue
            gate, reason = source_gate(source, db.get(PriceSeries, source.series_id), settings)
            job = CollectorJob(source_id=source.id, requested_by=source.created_by, trigger='scheduled',
                               status='queued', queued_at=now, scheduled_for=source.next_run_at)
            event(job, 'blocked' if gate == 'blocked' else 'queued', now,
                  reason if gate == 'blocked' else 'Lịch đến hạn đã xếp hàng.')
            if gate == 'blocked':
                job.error = reason
                job.finished_at = now
                source.enabled = False
                source.next_run_at = None
            else:
                source.next_run_at = now + timedelta(seconds=source.interval_seconds)
            db.add(job)
        db.commit()


def recover_expired(engine):
    now = datetime.now(UTC)
    with Session(engine) as db:
        jobs = db.scalars(select(CollectorJob).where(CollectorJob.status == 'running',
                          or_(CollectorJob.lease_expires_at <= now, CollectorJob.lease_expires_at.is_(None)))
                          .with_for_update(skip_locked=True))
        for job in jobs:
            job.error = 'Worker lease expired; execution interrupted. Retry explicitly or await the next schedule.'
            job.finished_at = now
            job.lease_token = None
            event(job, 'interrupted', now, job.error)
        db.commit()


def tick(engine, settings):
    with Session(engine) as db:
        job = db.scalar(select(CollectorJob).where(CollectorJob.status == 'queued').order_by(CollectorJob.id)
                        .with_for_update(skip_locked=True).limit(1))
        if not job:
            return False
        source = db.get(CollectorSource, job.source_id)
        gate, reason = source_gate(source, db.get(PriceSeries, source.series_id), settings)
        if gate == 'blocked':
            job.error = reason
            job.finished_at = datetime.now(UTC)
            event(job, 'blocked', job.finished_at, reason)
            db.commit()
            return True
        now = datetime.now(UTC)
        event(job, 'running', now, 'Đang lấy phản hồi HTTP fixture.')
        job.started_at = now
        token = str(uuid4())
        job.lease_token = token
        job.lease_expires_at = now + timedelta(seconds=120)
        job_id, case = job.id, source.fixture_case
        db.commit()

    # HTTP runs without database locks; completion must still own the unexpired lease.
    response, transport_error = None, None
    try:
        response = fetch_fixture(case)
    except httpx.RequestError:
        transport_error = 'HTTP transport failed; retry is required'
    fetched_at = datetime.now(UTC)
    with Session(engine) as db:
        job = db.scalar(select(CollectorJob).where(CollectorJob.id == job_id).with_for_update())
        if job.status != 'running' or job.lease_token != token:
            return True
        if job.lease_expires_at <= fetched_at:
            job.error = 'Worker lease expired before completion; no observations imported'
            job.finished_at = fetched_at
            job.lease_token = None
            event(job, 'interrupted', fetched_at, job.error)
            db.commit()
            return True
        source = db.get(CollectorSource, job.source_id)
        job.error = transport_error
        try:
            if response is not None:
                job.raw = response.content
                job.raw_sha256 = hashlib.sha256(response.content).hexdigest()
                job.http_status = response.status_code
                job.fetched_at = fetched_at
                if response.status_code != 200:
                    raise ValueError(f'HTTP {response.status_code}; response retained, no observations imported')
                record = record_price_import(source.series_id, collected_csv(response.content, fetched_at), db,
                                             job.requested_by, f'collector-{job.id}.csv')
                db.flush()
                job.import_id = record.id
                if record.counts['error'] or record.counts['conflict']:
                    raise ValueError(f"Import contains {record.counts['error']} error(s), {record.counts['conflict']} conflict(s)")
        except (UnicodeError, csv.Error, ValueError) as exc:
            job.error = str(exc)
        job.finished_at = datetime.now(UTC)
        job.lease_token = None
        event(job, 'failed' if job.error else 'succeeded', job.finished_at,
              job.error or 'Đã lưu phản hồi và kết quả nhập.')
        db.commit()
        return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--poll-seconds', type=float, default=5)
    args = parser.parse_args()
    if not 1 <= args.poll_seconds <= 60:
        parser.error('--poll-seconds must be between 1 and 60')
    settings = Settings()
    engine = create_engine(settings.database_url.get_secret_value(), pool_pre_ping=True)
    try:
        while True:
            recover_expired(engine)
            schedule_due(engine, settings)
            for _ in range(20):
                if not tick(engine, settings):
                    break
            if args.once:
                break
            time.sleep(args.poll_seconds)
    finally:
        engine.dispose()


if __name__ == '__main__':
    main()
