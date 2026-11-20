"""Administrator collector configuration, queue and execution audit."""
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from src.auth import DB, Administrator
from src.collector_models import CollectorJob, CollectorSource
from src.price_models import PriceImport, PriceSeries

router = APIRouter()


class NewSource(BaseModel):
    model_config = ConfigDict(extra="forbid")
    series_id: int
    connector: Literal['fixture_csv', 'external']
    fixture_case: Literal['valid', 'http_error', 'invalid_csv'] = 'valid'


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    retry_of: int | None = None


class SourceSchedule(BaseModel):
    model_config = ConfigDict(extra='forbid')
    enabled: bool
    interval_seconds: int = Field(default=3600, ge=60, le=604800)


def source_gate(source, series, settings):
    if source.connector != 'fixture_csv':
        return 'blocked', 'Nguồn thật chưa có quyết định quyền dùng và hợp đồng dữ liệu được kiểm chứng.'
    if series.dataset_kind != 'synthetic':
        return 'blocked', 'Fixture chỉ được ghi vào chuỗi synthetic.'
    if settings.app_env == 'production':
        return 'blocked', 'Fixture bị tắt trong môi trường production.'
    return 'fixture_only', 'Chỉ kiểm thử phần mềm bằng dữ liệu tự tạo; không phải nguồn giá thật.'


def source_data(source, db, settings):
    series = db.get(PriceSeries, source.series_id)
    gate, reason = source_gate(source, series, settings)
    return {'id': source.id, 'series_id': source.series_id, 'source_name': series.source_name,
            'locality_name': series.locality_name, 'connector': source.connector, 'fixture_case': source.fixture_case,
            'enabled': source.enabled, 'interval_seconds': source.interval_seconds,
            'next_run_at': source.next_run_at.isoformat() if source.next_run_at else None,
            'gate_status': gate, 'gate_reason': reason}


def job_data(job, db):
    record = db.get(PriceImport, job.import_id) if job.import_id else None
    return {'id': job.id, 'source_id': job.source_id, 'trigger': job.trigger, 'status': job.status,
            'retry_of': job.retry_of, 'import_id': job.import_id, 'error': job.error,
            'queued_at': job.queued_at.isoformat(), 'started_at': job.started_at.isoformat() if job.started_at else None,
            'finished_at': job.finished_at.isoformat() if job.finished_at else None,
            'fetched_at': job.fetched_at.isoformat() if job.fetched_at else None,
            'http_status': job.http_status, 'raw_sha256': job.raw_sha256, 'events': job.events,
            'counts': record.counts if record else None}


def event(job, status, now, message):
    job.status = status
    job.events = [*(job.events or []), {'at': now.isoformat(), 'status': status, 'message': message}]


@router.post('/admin/collector-sources', status_code=201)
def create_source(body: NewSource, db: DB, admin: Administrator, request: Request):
    if not db.get(PriceSeries, body.series_id):
        raise HTTPException(404, 'Price series not found')
    source = CollectorSource(**body.model_dump(), created_by=admin.id, enabled=False, interval_seconds=3600)
    db.add(source)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, 'Collector source already exists for this series') from exc
    return source_data(source, db, request.app.state.settings)


@router.get('/admin/collector-sources')
def list_sources(db: DB, admin: Administrator, request: Request):
    return [source_data(source, db, request.app.state.settings) for source in db.scalars(
        select(CollectorSource).order_by(CollectorSource.id))]


@router.patch('/admin/collector-sources/{source_id}')
def update_schedule(source_id: int, body: SourceSchedule, db: DB, admin: Administrator, request: Request):
    source = db.scalar(select(CollectorSource).where(CollectorSource.id == source_id).with_for_update())
    if not source:
        raise HTTPException(404, 'Collector source not found')
    gate, reason = source_gate(source, db.get(PriceSeries, source.series_id), request.app.state.settings)
    if body.enabled and gate == 'blocked':
        raise HTTPException(409, reason)
    source.enabled = body.enabled
    source.interval_seconds = body.interval_seconds
    source.next_run_at = datetime.now(UTC) if body.enabled else None
    db.commit()
    return source_data(source, db, request.app.state.settings)


@router.get('/admin/collector-jobs')
def list_jobs(db: DB, admin: Administrator, source_id: int | None = Query(default=None, ge=1),
              offset: int = Query(default=0, ge=0), limit: int = Query(default=50, ge=1, le=100)):
    query = select(CollectorJob)
    if source_id is not None:
        query = query.where(CollectorJob.source_id == source_id)
    return {'items': [job_data(job, db) for job in db.scalars(query.order_by(CollectorJob.id.desc()).offset(offset).limit(limit))],
            'total': db.scalar(select(func.count()).select_from(query.subquery())), 'offset': offset, 'limit': limit}


@router.post('/admin/collector-sources/{source_id}/runs', status_code=201)
def enqueue(source_id: int, body: RunRequest, db: DB, admin: Administrator, request: Request):
    source = db.scalar(select(CollectorSource).where(CollectorSource.id == source_id).with_for_update())
    if not source:
        raise HTTPException(404, 'Collector source not found')
    if db.scalar(select(CollectorJob.id).where(CollectorJob.source_id == source_id,
                                             CollectorJob.status.in_(['queued', 'running']))):
        raise HTTPException(409, 'A job is already queued or running')
    if body.retry_of is not None:
        previous = db.get(CollectorJob, body.retry_of)
        if not previous or previous.source_id != source_id or previous.status not in {'failed', 'interrupted'}:
            raise HTTPException(409, 'Retry requires a failed or interrupted job from this source')
    now = datetime.now(UTC)
    gate, reason = source_gate(source, db.get(PriceSeries, source.series_id), request.app.state.settings)
    job = CollectorJob(source_id=source_id, requested_by=admin.id, trigger='retry' if body.retry_of is not None else 'manual',
                       retry_of=body.retry_of, status='queued', queued_at=now)
    event(job, 'blocked' if gate == 'blocked' else 'queued', now, reason if gate == 'blocked' else 'Đã xếp hàng.')
    if gate == 'blocked':
        job.error = reason
        job.finished_at = now
    db.add(job)
    db.commit()
    return job_data(job, db)


@router.get('/admin/collector-jobs/{job_id}')
def get_job(job_id: int, db: DB, admin: Administrator):
    job = db.get(CollectorJob, job_id)
    if not job:
        raise HTTPException(404, 'Collector job not found')
    return job_data(job, db)


@router.get('/admin/collector-jobs/{job_id}/raw')
def raw_job(job_id: int, db: DB, admin: Administrator):
    job = db.get(CollectorJob, job_id)
    if not job or job.raw is None:
        raise HTTPException(404, 'No HTTP response retained')
    return Response(job.raw, media_type='application/octet-stream', headers={
        'Content-Disposition': f'attachment; filename="collector-{job.id}.bin"', 'Cache-Control': 'no-store'})
