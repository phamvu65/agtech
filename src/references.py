"""Reference imports retain original documents; monthly observations stay monthly."""

import calendar
import hashlib
import json
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, ValidationError, model_validator
from sqlalchemy import JSON, DateTime, ForeignKey, LargeBinary, String, UniqueConstraint, select
from sqlalchemy.orm import Mapped, mapped_column

from src.auth import DB, Administrator, Authenticated
from src.database import Base
from src.price_models import PriceSeries
from src.prices import csv_body

router = APIRouter()


class ReferenceImport(Base):
    __tablename__ = "reference_imports"
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    raw: Mapped[bytes] = mapped_column(LargeBinary)
    sha256: Mapped[str] = mapped_column(String(64))
    counts: Mapped[dict] = mapped_column(JSON)
    errors: Mapped[list] = mapped_column(JSON)


class ReferenceObservation(Base):
    __tablename__ = "reference_observations"
    __table_args__ = (UniqueConstraint("series_id", "identity", name="reference_identity"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"), index=True)
    import_id: Mapped[int] = mapped_column(ForeignKey("reference_imports.id"))
    identity: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")
    period_start: date
    period_end: date
    variable: str = Field(min_length=1, max_length=80)
    value: Decimal = Field(max_digits=14, decimal_places=6, allow_inf_nan=False)
    unit: str = Field(max_length=32)
    published_at: AwareDatetime | None = None
    available_at: AwareDatetime | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    product: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def times(self):
        if self.period_end < self.period_start or self.period_end > datetime.now(UTC).date():
            raise ValueError("Invalid historical period")
        if self.available_at and self.published_at and self.available_at < self.published_at:
            raise ValueError("Availability precedes publication")
        if self.available_at and self.available_at > datetime.now(UTC):
            raise ValueError("Availability is in the future")
        return self


class ReferenceDocument(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["international_monthly", "weather_daily"]
    source_name: str = Field(min_length=1, max_length=200)
    source_url: HttpUrl = Field(max_length=1000)
    license: str = Field(min_length=3, max_length=1000)
    attribution: str = Field(min_length=3, max_length=2000)
    dataset_kind: Literal["synthetic", "authorized"]
    records: list[dict] = Field(min_length=1, max_length=1000)


def store_reference(series_id, raw, db, user_id):
    series = db.scalar(select(PriceSeries).where(PriceSeries.id == series_id).with_for_update())
    if not series:
        raise HTTPException(404, "Price series not found")
    report = ReferenceImport(
        series_id=series_id,
        user_id=user_id,
        created_at=datetime.now(UTC),
        raw=raw,
        sha256=hashlib.sha256(raw).hexdigest(),
        counts={},
        errors=[],
    )
    db.add(report)
    db.flush()
    counts = {"valid": 0, "error": 0, "duplicate": 0, "conflict": 0}
    errors = []
    try:
        document = ReferenceDocument.model_validate_json(raw)
        if document.dataset_kind != series.dataset_kind:
            raise ValueError("Reference and target dataset kinds must match")
        metadata = document.model_dump(mode="json", exclude={"records"})
        for line, item in enumerate(document.records, start=1):
            try:
                point = Point.model_validate(item)
                if document.kind == "international_monthly":
                    if (
                        point.period_start.day != 1
                        or point.period_end
                        != date(
                            point.period_start.year,
                            point.period_start.month,
                            calendar.monthrange(point.period_start.year, point.period_start.month)[1],
                        )
                        or point.unit != "USD/kg"
                        or point.variable not in {"coffee_robusta", "coffee_arabica"}
                        or point.value <= 0
                        or point.latitude is not None
                        or point.longitude is not None
                    ):
                        raise ValueError("Expected a whole monthly coffee period in USD/kg")
                else:
                    units = {"temperature_2m_mean": "C", "precipitation_sum": "mm"}
                    if (
                        point.period_start != point.period_end
                        or point.latitude is None
                        or point.longitude is None
                        or not point.product
                        or units.get(point.variable) != point.unit
                        or (point.variable == "precipitation_sum" and point.value < 0)
                    ):
                        raise ValueError("Weather requires one day, coordinates, product and matching unit")
                payload = {**metadata, **point.model_dump(mode="json")}
                identity = {
                    key: payload[key]
                    for key in [
                        "kind",
                        "source_url",
                        "dataset_kind",
                        "period_start",
                        "period_end",
                        "variable",
                        "latitude",
                        "longitude",
                        "product",
                    ]
                }
                key = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
                old = db.scalar(
                    select(ReferenceObservation).where(
                        ReferenceObservation.series_id == series_id, ReferenceObservation.identity == key
                    )
                )
                if old:
                    counts["duplicate" if old.payload == payload else "conflict"] += 1
                else:
                    db.add(
                        ReferenceObservation(series_id=series_id, import_id=report.id, identity=key, payload=payload)
                    )
                    db.flush()
                    counts["valid"] += 1
            except (ValidationError, ValueError) as exc:
                counts["error"] += 1
                errors.append({"record": line, "message": str(exc)})
    except (ValidationError, ValueError) as exc:
        counts["error"] += 1
        errors.append({"record": 0, "message": str(exc)})
    report.counts = counts
    report.errors = errors
    db.flush()
    return {"id": report.id, "sha256": report.sha256, "counts": counts, "errors": errors}


@router.post("/admin/price-series/{series_id}/reference-imports", status_code=201)
def import_reference(series_id: int, raw: Annotated[bytes, Depends(csv_body)], db: DB, admin: Administrator):
    result = store_reference(series_id, raw, db, admin.id)
    db.commit()
    return result


@router.post("/admin/price-series/{series_id}/reference-fixture", status_code=201)
def reference_fixture(series_id: int, db: DB, admin: Administrator, request: Request):
    series = db.get(PriceSeries, series_id)
    if not series:
        raise HTTPException(404, "Price series not found")
    if series.dataset_kind != "synthetic" or request.app.state.settings.app_env == "production":
        raise HTTPException(409, "Fixture requires a synthetic series outside production")
    reports = []
    for kind, record in [
        (
            "international_monthly",
            {
                "period_start": "2025-06-01",
                "period_end": "2025-06-30",
                "variable": "coffee_robusta",
                "value": "3.2",
                "unit": "USD/kg",
                "published_at": "2025-07-01T00:00:00Z",
                "available_at": "2025-07-01T00:00:00Z",
            },
        ),
        (
            "weather_daily",
            {
                "period_start": "2025-06-23",
                "period_end": "2025-06-23",
                "variable": "temperature_2m_mean",
                "value": "25.5",
                "unit": "C",
                "latitude": 12.7,
                "longitude": 108.05,
                "product": "reanalysis_fixture",
                "published_at": "2025-06-25T00:00:00Z",
                "available_at": "2025-06-25T00:00:00Z",
            },
        ),
    ]:
        document = {
            "kind": kind,
            "source_name": "Fixture tự tạo",
            "source_url": "https://example.com/synthetic/" + kind,
            "license": "Dữ liệu tự tạo để kiểm thử",
            "attribution": "AGTECH synthetic fixture; không phải dữ liệu thị trường",
            "dataset_kind": "synthetic",
            "records": [record],
        }
        reports.append(store_reference(series_id, json.dumps(document, ensure_ascii=False).encode(), db, admin.id))
    db.commit()
    return {"imports": reports}


@router.get("/price-series/{series_id}/references")
def references(series_id: int, start: date, end: date, db: DB, user: Authenticated, as_of: AwareDatetime | None = None):
    if not 0 <= (end - start).days < 366:
        raise HTTPException(422, "Choose at most 366 ordered days")
    if not db.get(PriceSeries, series_id):
        raise HTTPException(404, "Price series not found")
    items = []
    for row in db.scalars(
        select(ReferenceObservation)
        .where(ReferenceObservation.series_id == series_id)
        .order_by(ReferenceObservation.id)
    ):
        item = row.payload
        if item["period_start"] > end.isoformat() or item["period_end"] < start.isoformat():
            continue
        if as_of and (not item["available_at"] or datetime.fromisoformat(item["available_at"]) > as_of):
            continue
        items.append({**item, "id": row.id, "import_id": row.import_id})
    return {"items": items, "reference_only": True, "as_of": as_of.isoformat() if as_of else None}


@router.get("/admin/reference-imports/{import_id}")
def reference_audit(import_id: int, db: DB, admin: Administrator):
    report = db.get(ReferenceImport, import_id)
    if not report:
        raise HTTPException(404, "Reference import not found")
    return {
        "id": report.id,
        "series_id": report.series_id,
        "sha256": report.sha256,
        "counts": report.counts,
        "errors": report.errors,
        "created_at": report.created_at.isoformat(),
        "user_id": report.user_id,
    }


@router.get("/admin/reference-imports/{import_id}/file")
def reference_original(import_id: int, db: DB, admin: Administrator):
    from fastapi import Response

    report = db.get(ReferenceImport, import_id)
    if not report:
        raise HTTPException(404, "Reference import not found")
    return Response(
        report.raw,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="reference-{report.id}.json"',
            "Cache-Control": "no-store",
        },
    )
