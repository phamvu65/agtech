"""Versioned risk assessments; no production thresholds or validation evidence are invented."""

import hashlib
import json
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from src.analysis import DataSnapshot, available
from src.auth import DB, Administrator, Authenticated
from src.database import Base
from src.forecasts import ForecastRun
from src.price_models import PriceSeries

router = APIRouter()


class RiskPolicy(Base):
    __tablename__ = "risk_policies"
    __table_args__ = (UniqueConstraint("series_id", "version", name="risk_policy_version"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"))
    version: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sha256: Mapped[str] = mapped_column(String(64))
    config: Mapped[dict] = mapped_column(JSON)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    __table_args__ = (UniqueConstraint("series_id", "idempotency_key", name="risk_idempotency"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"), index=True)
    forecast_id: Mapped[int] = mapped_column(ForeignKey("forecast_runs.id"))
    policy_id: Mapped[int | None] = mapped_column(ForeignKey("risk_policies.id"))
    idempotency_key: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    as_of: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(24))
    level: Mapped[str | None] = mapped_column(String(8))
    payload: Mapped[dict] = mapped_column(JSON)


class PolicyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: str = Field(min_length=1, max_length=80)
    t1: Decimal = Field(gt=0, allow_inf_nan=False)
    t2: Decimal = Field(gt=0, allow_inf_nan=False)
    freshness_hours: Decimal = Field(gt=0, le=87600, allow_inf_nan=False)
    anomaly_pct: Decimal = Field(gt=0, allow_inf_nan=False)
    recovery_mode: Literal["pending", "compare_last_valid"]

    @model_validator(mode="after")
    def bounds(self):
        if self.t1 >= self.t2:
            raise ValueError("Require 0 < t1 < t2")
        return self


class AssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    forecast_id: int
    policy_id: int | None = None
    idempotency_key: str = Field(min_length=1, max_length=100)


@router.post("/admin/price-series/{series_id}/risk-policies", status_code=201)
def create_policy(series_id: int, body: PolicyRequest, db: DB, admin: Administrator, request: Request):
    series = db.get(PriceSeries, series_id)
    if not series:
        raise HTTPException(404, "Price series not found")
    if series.dataset_kind != "synthetic" or request.app.state.settings.app_env == "production":
        raise HTTPException(
            409, "Unvalidated thresholds can only be configured for synthetic fixtures outside production"
        )
    config = {
        **body.model_dump(mode="json"),
        "mode": "fixture",
        "method": "minimum_forecast_drop_v1",
        "validation_status": "not_operationally_validated",
    }
    policy = RiskPolicy(
        series_id=series_id,
        version=body.version,
        created_at=datetime.now(UTC),
        config=config,
        sha256=hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest(),
    )
    db.add(policy)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Policy version already exists") from exc
    return {"id": policy.id, "sha256": policy.sha256, "config": policy.config, "operational_eligible": False}


def assessment_data(record):
    return {
        "id": record.id,
        "series_id": record.series_id,
        "forecast_id": record.forecast_id,
        "policy_id": record.policy_id,
        "as_of": record.as_of.isoformat(),
        "created_at": record.created_at.isoformat(),
        "status": record.status,
        "level": record.level,
        "idempotency_key": record.idempotency_key,
        **record.payload,
    }


def evaluate_risk(forecast, policy, db, settings):
    result = {
        "operational_eligible": False,
        "rule_version": "minimum_forecast_drop_v1",
        "policy_version": policy.version if policy else None,
        "policy_sha256": policy.sha256 if policy else None,
        "reasons": [],
        "drop_pct": None,
        "anomaly": {"flag": None, "method": "observed_change_pct_v1"},
    }
    points = forecast.payload.get("predictions", [])
    if (
        forecast.mode != "fixture"
        or forecast.payload.get("status") != "fixture"
        or not policy
        or settings.app_env == "production"
    ):
        result["reasons"] = ["Data/model/rule validation gate not passed."]
        return None, result
    expected = [(forecast.as_of.astimezone(UTC).date() + timedelta(days=h)).isoformat() for h in range(1, 8)]
    if len(points) != 7 or [point["date"] for point in points] != expected:
        result["reasons"] = ["Require seven next calendar days."]
        return None, result
    p0 = Decimal(forecast.payload["current_price"])
    prices = [Decimal(point["price"]) for point in points]
    if p0 <= 0 or any(not value.is_finite() or value <= 0 for value in prices):
        result["reasons"] = ["Invalid input price."]
        return None, result
    if Decimal(str(forecast.payload["data_age_seconds"])) > Decimal(policy.config["freshness_hours"]) * 3600:
        result["reasons"] = ["Input data exceeds the explicitly configured fixture freshness policy."]
        return None, result
    drop = max(Decimal(0), (p0 - min(prices)) / p0 * 100)
    t1, t2 = Decimal(policy.config["t1"]), Decimal(policy.config["t2"])
    level = "LOW" if drop < t1 else "MEDIUM" if drop < t2 else "HIGH"
    result["drop_pct"] = str(drop)
    result["reasons"] = ["Fixture rule execution only; not an approved operational risk assessment."]
    snapshot = db.get(DataSnapshot, forecast.payload["snapshot_id"])
    known = [row for row in snapshot.payload["observations"] if available(row, forecast.as_of)]
    if len(known) >= 2 and date.fromisoformat(known[-1]["observed_on"]) - date.fromisoformat(
        known[-2]["observed_on"]
    ) == timedelta(days=1):
        change = abs((Decimal(known[-1]["price"]) - Decimal(known[-2]["price"])) / Decimal(known[-2]["price"]) * 100)
        result["anomaly"].update(
            flag=change >= Decimal(policy.config["anomaly_pct"]),
            change_pct=str(change),
            observed_on=known[-1]["observed_on"],
            price=known[-1]["price"],
        )
    return level, result


@router.post("/admin/risk-assessments", status_code=201)
def create_assessment(body: AssessmentRequest, db: DB, admin: Administrator, request: Request):
    forecast = db.get(ForecastRun, body.forecast_id)
    if not forecast:
        raise HTTPException(404, "Forecast not found")
    series = db.scalar(select(PriceSeries).where(PriceSeries.id == forecast.series_id).with_for_update())
    old = db.scalar(
        select(RiskAssessment).where(
            RiskAssessment.series_id == series.id, RiskAssessment.idempotency_key == body.idempotency_key
        )
    )
    if old:
        if old.forecast_id != body.forecast_id or old.policy_id != body.policy_id:
            raise HTTPException(409, "Idempotency key already used for another assessment")
        return assessment_data(old)
    policy = db.get(RiskPolicy, body.policy_id) if body.policy_id else None
    if body.policy_id and (not policy or policy.series_id != series.id):
        raise HTTPException(409, "Policy not found for this series")
    level, payload = evaluate_risk(forecast, policy, db, request.app.state.settings)
    record = RiskAssessment(
        series_id=series.id,
        forecast_id=forecast.id,
        policy_id=body.policy_id,
        idempotency_key=body.idempotency_key,
        created_at=datetime.now(UTC),
        as_of=forecast.as_of,
        status="fixture" if level else "unavailable",
        level=level,
        payload=payload,
    )
    db.add(record)
    db.flush()
    from src.personal import publish_notifications

    publish_notifications(db, record, policy)
    db.commit()
    return assessment_data(record)


@router.get("/price-series/{series_id}/risk/latest")
def latest_risk(series_id: int, db: DB, user: Authenticated):
    if not db.get(PriceSeries, series_id):
        raise HTTPException(404, "Price series not found")
    record = db.scalar(
        select(RiskAssessment)
        .where(RiskAssessment.series_id == series_id)
        .order_by(RiskAssessment.as_of.desc(), RiskAssessment.id.desc())
        .limit(1)
    )
    return (
        assessment_data(record)
        if record
        else {
            "id": None,
            "status": "unavailable",
            "level": None,
            "operational_eligible": False,
            "reasons": ["No validated data/model/rule configuration is available."],
            "anomaly": {"flag": None},
        }
    )


@router.get("/price-series/{series_id}/risk")
def risk_history(
    series_id: int, db: DB, user: Authenticated, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)
):
    return {
        "items": [
            assessment_data(record)
            for record in db.scalars(
                select(RiskAssessment)
                .where(RiskAssessment.series_id == series_id)
                .order_by(RiskAssessment.as_of.desc(), RiskAssessment.id.desc())
                .offset(offset)
                .limit(limit)
            )
        ]
    }
