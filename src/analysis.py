"""Immutable point-in-time snapshots and fixture-only baseline/candidate evaluation."""

import hashlib
import json
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, model_validator
from sqlalchemy import JSON, DateTime, ForeignKey, String, select
from sqlalchemy.orm import Mapped, mapped_column

from src.auth import DB, Administrator
from src.database import Base
from src.price_models import PriceObservation, PriceSeries
from src.prices import series_data

router = APIRouter()
VERSION = "linear_time_v1"


class DataSnapshot(Base):
    __tablename__ = "data_snapshots"
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sha256: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)


class BacktestRun(Base):
    __tablename__ = "backtest_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("data_snapshots.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    config: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32))
    reasons: Mapped[list] = mapped_column(JSON)
    metrics: Mapped[dict] = mapped_column(JSON)
    artifact: Mapped[dict] = mapped_column(JSON)


class BacktestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    snapshot_id: int
    train_end: date
    validation_end: date
    test_end: date
    mode: Literal["official", "fixture"] = "official"

    @model_validator(mode="after")
    def order(self):
        if not self.train_end < self.validation_end < self.test_end:
            raise ValueError("Require train_end < validation_end < test_end")
        if (self.test_end - self.train_end).days > 3660:
            raise ValueError("Evaluation request exceeds resource limit of 3660 days")
        return self


def end_of_day(day):
    return datetime.combine(day, time.max, UTC)


def available(row, at):
    return (
        date.fromisoformat(row["observed_on"]) <= at.astimezone(UTC).date()
        and datetime.fromisoformat(row["available_at"]) <= at
    )


def snapshot_data(snapshot):
    return {
        "id": snapshot.id,
        "sha256": snapshot.sha256,
        "created_at": snapshot.created_at.isoformat(),
        "payload": snapshot.payload,
    }


@router.post("/admin/price-series/{series_id}/snapshots", status_code=201)
def snapshot(series_id: int, db: DB, admin: Administrator):
    series = db.scalar(select(PriceSeries).where(PriceSeries.id == series_id).with_for_update())
    if not series:
        raise HTTPException(404, "Price series not found")
    rows = list(
        db.scalars(
            select(PriceObservation)
            .where(PriceObservation.series_id == series_id)
            .order_by(PriceObservation.observed_on)
            .limit(100001)
        )
    )
    if len(rows) > 100000:
        raise HTTPException(413, "Snapshot exceeds 100000-observation resource limit")
    payload = {
        "version": 1,
        "series": series_data(series),
        "observations": [
            {
                "id": row.id,
                "observed_on": row.observed_on.isoformat(),
                "price": str(row.price_vnd_per_kg),
                "published_at": row.published_at.isoformat() if row.published_at else None,
                "collected_at": row.collected_at.isoformat(),
                "available_at": (row.published_at or row.collected_at).isoformat(),
                "availability_basis": "publication" if row.published_at else "first_collection",
                "import_id": row.import_id,
                "source_document_url": row.source_document_url,
            }
            for row in rows
        ],
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    record = DataSnapshot(
        series_id=series_id,
        user_id=admin.id,
        created_at=datetime.now(UTC),
        sha256=hashlib.sha256(canonical.encode()).hexdigest(),
        payload=payload,
    )
    db.add(record)
    db.commit()
    return snapshot_data(record)


@router.get("/admin/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: int, db: DB, admin: Administrator):
    record = db.get(DataSnapshot, snapshot_id)
    if not record:
        raise HTTPException(404, "Snapshot not found")
    return snapshot_data(record)


def fit_training(rows, train_end):
    train = [row for row in rows if available(row, end_of_day(train_end))]
    if len(train) < 2:
        return None
    origin = date.fromisoformat(rows[0]["observed_on"])
    xs = [Decimal((date.fromisoformat(row["observed_on"]) - origin).days) for row in train]
    ys = [Decimal(row["price"]) for row in train]
    mx = sum(xs) / len(xs)
    my = sum(ys) / len(ys)
    variance = sum((x - mx) ** 2 for x in xs)
    if not variance:
        return None
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / variance
    return {
        "algorithm": VERSION,
        "origin_date": origin.isoformat(),
        "intercept": str(my - slope * mx),
        "slope": str(slope),
        "trained_until": train_end.isoformat(),
        "training_count": len(train),
        "training_ids": [row["id"] for row in train],
    }


def predict(artifact, day):
    return (
        Decimal(artifact["intercept"])
        + Decimal(artifact["slope"]) * (day - date.fromisoformat(artifact["origin_date"])).days
    )


def evaluate(rows, artifact, start, end):
    truth = {date.fromisoformat(row["observed_on"]): Decimal(row["price"]) for row in rows}
    report = {}
    for horizon in range(1, 8):
        baseline_errors = []
        model_errors = []
        expected = 0
        missing = 0
        unavailable = 0
        for offset in range((end - start).days + 1):
            origin = start + timedelta(days=offset)
            target = origin + timedelta(days=horizon)
            if target > end:
                continue
            expected += 1
            if target not in truth:
                missing += 1
                continue
            known = [row for row in rows if available(row, end_of_day(origin))]
            candidate = predict(artifact, target)
            if not known or candidate <= 0:
                unavailable += 1
                continue
            baseline = Decimal(known[-1]["price"])
            baseline_errors.append(abs(baseline - truth[target]))
            model_errors.append(abs(candidate - truth[target]))
        count = len(baseline_errors)
        baseline_mae = sum(baseline_errors) / count if count else None
        model_mae = sum(model_errors) / count if count else None
        report[str(horizon)] = {
            "target_count": count,
            "expected_targets": expected,
            "missing_targets": missing,
            "unavailable_inputs": unavailable,
            "coverage": count / expected if expected else None,
            "baseline_mae": str(baseline_mae) if baseline_mae is not None else None,
            "model_mae": str(model_mae) if model_mae is not None else None,
            "relative_improvement": str((baseline_mae - model_mae) / baseline_mae) if baseline_mae else None,
        }
    return report


def backtest_data(run):
    return {
        "id": run.id,
        "snapshot_id": run.snapshot_id,
        "created_at": run.created_at.isoformat(),
        "config": run.config,
        "status": run.status,
        "reasons": run.reasons,
        "metrics": run.metrics,
        "artifact": run.artifact,
        "operational_eligible": False,
    }


@router.post("/admin/backtests", status_code=201)
def backtest(body: BacktestRequest, db: DB, admin: Administrator, request: Request):
    snapshot = db.get(DataSnapshot, body.snapshot_id)
    if not snapshot:
        raise HTTPException(404, "Snapshot not found")
    rows = snapshot.payload["observations"]
    config = {**body.model_dump(mode="json"), "version": VERSION, "snapshot_sha256": snapshot.sha256}
    run = BacktestRun(
        snapshot_id=snapshot.id,
        created_at=datetime.now(UTC),
        config=config,
        status="blocked",
        reasons=[],
        metrics={},
        artifact={},
    )
    if body.mode == "official":
        run.reasons = [
            "Source permission/history/update gate not verified; official training disabled.",
            "Improvement and per-horizon acceptance criteria are not frozen.",
        ]
    else:
        if (
            snapshot.payload["series"]["dataset_kind"] != "synthetic"
            or request.app.state.settings.app_env == "production"
        ):
            raise HTTPException(409, "Fixture evaluation requires synthetic data outside production")
        artifact = fit_training(rows, body.train_end) if rows else None
        if not artifact:
            run.status = "insufficient_data"
            run.reasons = ["Need at least two available training observations with distinct dates."]
        else:
            run.status = "fixture_evaluated"
            run.reasons = ["Synthetic behavior test only; no evidence of forecasting quality."]
            run.artifact = artifact
            run.metrics = {
                "validation": evaluate(rows, artifact, body.train_end + timedelta(days=1), body.validation_end),
                "test": evaluate(rows, artifact, body.validation_end + timedelta(days=1), body.test_end),
            }
    db.add(run)
    db.commit()
    return backtest_data(run)


@router.get("/admin/backtests/{run_id}")
def get_backtest(run_id: int, db: DB, admin: Administrator):
    run = db.get(BacktestRun, run_id)
    if not run:
        raise HTTPException(404, "Backtest not found")
    return backtest_data(run)
