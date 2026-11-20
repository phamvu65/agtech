"""Immutable seven-calendar-day forecasts; operational publication remains gated."""

from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import AwareDatetime, BaseModel, ConfigDict, model_validator
from sqlalchemy import JSON, DateTime, ForeignKey, String, select
from sqlalchemy.orm import Mapped, mapped_column

from src.analysis import BacktestRun, DataSnapshot, available, predict
from src.auth import DB, Administrator, Authenticated
from src.database import Base
from src.price_models import PriceSeries

router = APIRouter()


class ForecastRun(Base):
    __tablename__ = "forecast_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"), index=True)
    backtest_id: Mapped[int | None] = mapped_column(ForeignKey("backtest_runs.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    as_of: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    mode: Mapped[str] = mapped_column(String(16))
    payload: Mapped[dict] = mapped_column(JSON)


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    as_of: AwareDatetime
    mode: Literal["official", "fixture"] = "official"
    backtest_id: int | None = None

    @model_validator(mode="after")
    def time(self):
        if self.as_of > datetime.now(UTC):
            raise ValueError("Forecast origin cannot be in the future")
        return self


def forecast_data(run):
    return {
        "id": run.id,
        "series_id": run.series_id,
        "backtest_id": run.backtest_id,
        "created_at": run.created_at.isoformat(),
        "as_of": run.as_of.isoformat(),
        "mode": run.mode,
        **run.payload,
    }


@router.post("/admin/price-series/{series_id}/forecasts", status_code=201)
def create_forecast(series_id: int, body: ForecastRequest, db: DB, admin: Administrator, request: Request):
    series = db.get(PriceSeries, series_id)
    if not series:
        raise HTTPException(404, "Price series not found")
    payload = {
        "status": "unavailable",
        "operational_eligible": False,
        "predictions": [],
        "reasons": ["Source/model acceptance and freshness policies are unverified."],
        "data_as_of": None,
        "data_age_seconds": None,
        "model_version": None,
        "snapshot_sha256": None,
    }
    backtest_id = None
    if body.mode == "fixture":
        if series.dataset_kind != "synthetic" or request.app.state.settings.app_env == "production":
            raise HTTPException(409, "Fixture forecast requires synthetic data outside production")
        report = db.get(BacktestRun, body.backtest_id) if body.backtest_id else None
        if not report:
            raise HTTPException(404, "Fixture backtest not found")
        snapshot = db.get(DataSnapshot, report.snapshot_id)
        if snapshot.series_id != series_id:
            raise HTTPException(409, "Backtest belongs to another series")
        backtest_id = report.id
        if report.status != "fixture_evaluated" or not report.artifact:
            payload["reasons"] = ["Backtest has no usable fixture artifact."]
        elif datetime.fromisoformat(report.artifact["trained_until"]).date() > body.as_of.astimezone(UTC).date():
            payload["reasons"] = ["Model training cutoff is after forecast origin."]
        else:
            known = [row for row in snapshot.payload["observations"] if available(row, body.as_of.astimezone(UTC))]
            if not known:
                payload["reasons"] = ["No observation was available at forecast origin."]
            else:
                origin = body.as_of.astimezone(UTC).date()
                predictions = [
                    {
                        "date": (origin + timedelta(days=h)).isoformat(),
                        "price": str(predict(report.artifact, origin + timedelta(days=h))),
                    }
                    for h in range(1, 8)
                ]
                if any(float(item["price"]) <= 0 for item in predictions):
                    payload["reasons"] = ["Model returned an invalid nonpositive price."]
                else:
                    payload.update(
                        status="fixture",
                        predictions=predictions,
                        reasons=["Synthetic simulation; not approved for operational decisions."],
                        data_as_of=known[-1]["observed_on"],
                        data_age_seconds=(
                            body.as_of - datetime.fromisoformat(known[-1]["available_at"])
                        ).total_seconds(),
                        current_price=known[-1]["price"],
                        model_version=report.artifact["algorithm"],
                        snapshot_sha256=snapshot.sha256,
                        snapshot_id=snapshot.id,
                        historical_simulation=origin < datetime.now(UTC).date(),
                    )
    run = ForecastRun(
        series_id=series_id,
        backtest_id=backtest_id,
        created_at=datetime.now(UTC),
        as_of=body.as_of,
        mode=body.mode,
        payload=payload,
    )
    db.add(run)
    db.commit()
    return forecast_data(run)


@router.get("/price-series/{series_id}/forecasts/latest")
def latest_forecast(series_id: int, db: DB, user: Authenticated):
    if not db.get(PriceSeries, series_id):
        raise HTTPException(404, "Price series not found")
    run = db.scalar(
        select(ForecastRun)
        .where(ForecastRun.series_id == series_id)
        .order_by(ForecastRun.as_of.desc(), ForecastRun.id.desc())
        .limit(1)
    )
    return (
        forecast_data(run)
        if run
        else {
            "id": None,
            "status": "unavailable",
            "operational_eligible": False,
            "predictions": [],
            "reasons": ["No evaluated model/forecast is available."],
        }
    )


@router.get("/price-series/{series_id}/forecasts")
def forecast_history(
    series_id: int, db: DB, user: Authenticated, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)
):
    return {
        "items": [
            forecast_data(run)
            for run in db.scalars(
                select(ForecastRun)
                .where(ForecastRun.series_id == series_id)
                .order_by(ForecastRun.as_of.desc(), ForecastRun.id.desc())
                .offset(offset)
                .limit(limit)
            )
        ]
    }


@router.get("/forecasts/{run_id}")
def get_forecast(run_id: int, db: DB, user: Authenticated):
    run = db.get(ForecastRun, run_id)
    if not run:
        raise HTTPException(404, "Forecast not found")
    return forecast_data(run)
