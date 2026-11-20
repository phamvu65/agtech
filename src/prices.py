"""Public price history and administrator imports; observations are never overwritten."""
import csv
import hashlib
import io
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, ValidationError, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.auth import DB, Administrator, Authenticated
from src.database import User
from src.price_models import PriceImport, PriceObservation, PriceSeries

router = APIRouter()
COLUMNS = ['observed_on', 'price_vnd_per_kg', 'unit', 'published_at', 'collected_at', 'source_document_url']


class NewSeries(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    commodity: str = Field(min_length=1, max_length=120)
    locality_code: str = Field(min_length=1, max_length=80)
    locality_name: str = Field(min_length=1, max_length=120)
    quality: str = Field(min_length=1, max_length=200)
    source_name: str = Field(min_length=1, max_length=200)
    source_url: HttpUrl = Field(max_length=1000)
    dataset_kind: Literal['synthetic', 'authorized']
    rights_basis: str = Field(min_length=10, max_length=4000)


class PriceRow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    observed_on: date
    price_vnd_per_kg: Decimal = Field(gt=0, max_digits=14, decimal_places=2)
    unit: Literal['VND/kg']
    published_at: AwareDatetime | None
    collected_at: AwareDatetime
    source_document_url: HttpUrl = Field(max_length=1000)

    @model_validator(mode='after')
    def check_times(self):
        if self.observed_on > self.collected_at.astimezone(ZoneInfo('Asia/Ho_Chi_Minh')).date():
            raise ValueError('Observation day is after collection in Asia/Ho_Chi_Minh')
        if self.published_at and self.published_at > self.collected_at:
            raise ValueError('Publication is after collection')
        if self.collected_at > datetime.now(UTC):
            raise ValueError('Collection is in the future')
        return self


def series_data(series):
    return {'id': series.id, **{field: getattr(series, field) for field in NewSeries.model_fields}, 'unit': 'VND/kg'}


@router.post('/admin/price-series', status_code=201)
def create_series(body: NewSeries, db: DB, admin: Administrator):
    data = body.model_dump(mode='json')
    series = PriceSeries(**data)
    db.add(series)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, 'Price series already exists') from exc
    return series_data(series)


@router.get('/price-series')
def list_series(db: DB, user: Authenticated):
    return [series_data(series) for series in db.scalars(select(PriceSeries).order_by(PriceSeries.id))]


def import_data(record, db):
    return {'id': record.id, 'series_id': record.series_id, 'filename': record.filename, 'sha256': record.sha256,
            'created_at': record.created_at.isoformat(), 'created_by': db.get(User, record.user_id).username,
            'counts': record.counts, 'rows': record.rows}


async def csv_body(request: Request) -> bytes:
    raw_buffer = bytearray()
    async for chunk in request.stream():
        raw_buffer.extend(chunk)
        if len(raw_buffer) > 2_000_000:
            raise HTTPException(413, 'CSV must be at most 2 MB')
    return bytes(raw_buffer)


@router.post('/admin/price-series/{series_id}/imports', status_code=201)
def import_prices(series_id: int, raw: Annotated[bytes, Depends(csv_body)], db: DB, admin: Administrator,
                  filename: str = Query(default='prices.csv', min_length=1, max_length=200)):
    series = db.scalar(select(PriceSeries).where(PriceSeries.id == series_id).with_for_update())
    if not series:
        raise HTTPException(404, 'Price series not found')
    counts = {'valid': 0, 'error': 0, 'duplicate': 0, 'conflict': 0}
    record = PriceImport(series_id=series_id, user_id=admin.id, created_at=datetime.now(UTC), filename=filename,
                         sha256=hashlib.sha256(raw).hexdigest(), original=raw, counts=dict(counts), rows=[])
    db.add(record)
    db.flush()
    rows = []
    try:
        reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')), strict=True)
        if reader.fieldnames != COLUMNS:
            raise ValueError('CSV header must match the template exactly')
        for line, row in enumerate(reader, start=2):
            try:
                parsed = PriceRow.model_validate({**row, 'published_at': row.get('published_at') or None})
            except ValidationError as exc:
                counts['error'] += 1
                rows.append({'line': line, 'status': 'error',
                             'errors': [f"{'.'.join(map(str, error['loc'])) or 'row'}: {error['msg']}" for error in exc.errors()]})
                continue
            existing = db.scalar(select(PriceObservation).where(
                PriceObservation.series_id == series_id, PriceObservation.observed_on == parsed.observed_on))
            if existing:
                same = (existing.price_vnd_per_kg == parsed.price_vnd_per_kg
                        and existing.published_at == parsed.published_at
                        and existing.source_document_url == str(parsed.source_document_url))
                status = 'duplicate' if same else 'conflict'
                counts[status] += 1
                rows.append({'line': line, 'status': status, 'observation_id': existing.id})
                continue
            values = parsed.model_dump(exclude={'unit', 'source_document_url'})
            observation = PriceObservation(series_id=series_id, import_id=record.id, **values,
                                           source_document_url=str(parsed.source_document_url))
            db.add(observation)
            db.flush()
            counts['valid'] += 1
            rows.append({'line': line, 'status': 'valid', 'observation_id': observation.id})
        if not rows:
            raise ValueError('CSV contains no data rows')
    except (UnicodeDecodeError, csv.Error, ValueError) as exc:
        counts['error'] += 1
        rows.append({'line': 1, 'status': 'error', 'errors': [str(exc)]})
    record.counts = dict(counts)
    record.rows = rows
    db.commit()
    return import_data(record, db)


@router.get('/admin/imports/{import_id}')
def get_import(import_id: int, db: DB, admin: Administrator):
    record = db.get(PriceImport, import_id)
    if not record:
        raise HTTPException(404, 'Import not found')
    return import_data(record, db)


@router.get('/admin/imports/{import_id}/file')
def original_file(import_id: int, db: DB, admin: Administrator):
    record = db.get(PriceImport, import_id)
    if not record:
        raise HTTPException(404, 'Import not found')
    return Response(record.original, media_type='text/csv', headers={
        'Content-Disposition': f'attachment; filename="import-{record.id}.csv"', 'Cache-Control': 'no-store'})


@router.get('/price-series/{series_id}/history')
def history(series_id: int, start: date, end: date, db: DB, user: Authenticated):
    if not 0 <= (end - start).days < 366:
        raise HTTPException(422, "Choose an ordered range of at most 366 calendar days")
    series = db.get(PriceSeries, series_id)
    if not series:
        raise HTTPException(404, 'Price series not found')
    observations = {row.observed_on: row for row in db.scalars(select(PriceObservation).where(
        PriceObservation.series_id == series_id, PriceObservation.observed_on >= start, PriceObservation.observed_on <= end))}
    days = []
    for offset in range((end - start).days + 1):
        day = start + timedelta(days=offset)
        row = observations.get(day)
        item = {'observed_on': day.isoformat(), 'price_vnd_per_kg': f'{row.price_vnd_per_kg:.2f}' if row else None}
        if row:
            item.update(published_at=row.published_at.isoformat() if row.published_at else None,
                        collected_at=row.collected_at.isoformat(), source_document_url=row.source_document_url,
                        import_id=row.import_id)
        days.append(item)
    return {'series': series_data(series), 'days': days}

