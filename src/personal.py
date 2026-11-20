"""Private followings and idempotent risk-change inbox shared by web/mobile."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import JSON, DateTime, ForeignKey, UniqueConstraint, delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column

from src.auth import DB, Authenticated
from src.database import Base, User
from src.price_models import PriceSeries
from src.prices import series_data
from src.risk import RiskAssessment

router = APIRouter()


class Following(Base):
    __tablename__ = "followings"
    __table_args__ = (UniqueConstraint("user_id", "series_id", name="following_owner_series"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    series_id: Mapped[int] = mapped_column(ForeignKey("price_series.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("user_id", "assessment_id", name="notification_owner_assessment"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("risk_assessments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    payload: Mapped[dict] = mapped_column(JSON)


class FollowRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    series_id: int


class ReadRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    read: Literal[True] = True


def publish_notifications(db, record, policy):
    previous = db.scalar(
        select(RiskAssessment)
        .where(
            RiskAssessment.series_id == record.series_id,
            RiskAssessment.id != record.id,
            RiskAssessment.as_of <= record.as_of,
        )
        .order_by(RiskAssessment.as_of.desc(), RiskAssessment.id.desc())
        .limit(1)
    )
    valid = db.scalar(
        select(RiskAssessment)
        .where(
            RiskAssessment.series_id == record.series_id,
            RiskAssessment.id != record.id,
            RiskAssessment.as_of <= record.as_of,
            RiskAssessment.level.is_not(None),
        )
        .order_by(RiskAssessment.as_of.desc(), RiskAssessment.id.desc())
        .limit(1)
    )
    newer = db.scalar(
        select(RiskAssessment.id)
        .where(
            RiskAssessment.series_id == record.series_id,
            RiskAssessment.id != record.id,
            RiskAssessment.as_of > record.as_of,
        )
        .limit(1)
    )
    decision = "unchanged"
    emit = False
    if record.level is None:
        decision = "unavailable_no_risk_notification"
    elif newer:
        decision = "historical_backfill_no_notification"
    elif previous and previous.level is None and valid and policy.config["recovery_mode"] == "pending":
        decision = "recovery_policy_pending"
    elif valid is None:
        emit = record.level in {"MEDIUM", "HIGH"}
        decision = "initial_elevated" if emit else "initial_low_no_notification"
    elif valid.level != record.level:
        emit = True
        decision = "risk_level_changed"
    record.payload = {**record.payload, "notification_decision": decision}
    if not emit:
        return
    series = db.get(PriceSeries, record.series_id)
    subscribers = db.scalars(
        select(Following)
        .join(User, Following.user_id == User.id)
        .where(
            Following.series_id == record.series_id, Following.created_at <= record.created_at, User.active.is_(True)
        )
    )
    for follower in subscribers:
        db.add(
            Notification(
                user_id=follower.user_id,
                assessment_id=record.id,
                created_at=record.created_at,
                payload={
                    "type": "risk_change",
                    "series_id": series.id,
                    "series_name": f"{series.commodity} · {series.locality_name} · {series.quality}",
                    "dataset_kind": series.dataset_kind,
                    "level": record.level,
                    "previous_level": valid.level if valid else None,
                    "forecast_id": record.forecast_id,
                    "policy_version": record.payload["policy_version"],
                    "as_of": record.as_of.isoformat(),
                    "fixture": record.status == "fixture",
                },
            )
        )


@router.post("/me/followings", status_code=201)
def follow(body: FollowRequest, db: DB, user: Authenticated):
    if not db.get(PriceSeries, body.series_id):
        raise HTTPException(404, "Price series not found")
    if not db.scalar(select(Following.id).where(Following.user_id == user.id, Following.series_id == body.series_id)):
        db.add(Following(user_id=user.id, series_id=body.series_id, created_at=datetime.now(UTC)))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    return {"series_id": body.series_id, "following": True}


@router.delete("/me/followings/{series_id}", status_code=204)
def unfollow(series_id: int, db: DB, user: Authenticated):
    db.execute(delete(Following).where(Following.user_id == user.id, Following.series_id == series_id))
    db.commit()


@router.get("/me/followings")
def followings(
    db: DB, user: Authenticated, response: Response, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)
):
    response.headers["Cache-Control"] = "no-store"
    query = select(Following).where(Following.user_id == user.id)
    items = []
    for row in db.scalars(query.order_by(Following.id).offset(offset).limit(limit)):
        items.append({**series_data(db.get(PriceSeries, row.series_id)), "followed_at": row.created_at.isoformat()})
    return {
        "items": items,
        "total": db.scalar(select(func.count()).select_from(query.subquery())),
        "offset": offset,
        "limit": limit,
    }


def notification_data(record):
    return {
        "id": record.id,
        "assessment_id": record.assessment_id,
        "created_at": record.created_at.isoformat(),
        "read_at": record.read_at.isoformat() if record.read_at else None,
        **record.payload,
    }


@router.get("/me/notifications")
def notifications(
    db: DB, user: Authenticated, response: Response, offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100)
):
    response.headers["Cache-Control"] = "no-store"
    query = select(Notification).where(Notification.user_id == user.id)
    return {
        "items": [
            notification_data(row)
            for row in db.scalars(query.order_by(Notification.id.desc()).offset(offset).limit(limit))
        ],
        "total": db.scalar(select(func.count()).select_from(query.subquery())),
        "unread_count": db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.user_id == user.id, Notification.read_at.is_(None))
        ),
        "offset": offset,
        "limit": limit,
    }


@router.patch("/me/notifications/{notification_id}")
def mark_read(notification_id: int, body: ReadRequest, db: DB, user: Authenticated):
    record = db.scalar(
        select(Notification)
        .where(Notification.id == notification_id, Notification.user_id == user.id)
        .with_for_update()
    )
    if not record:
        raise HTTPException(404, "Notification not found")
    if record.read_at is None:
        record.read_at = datetime.now(UTC)
    db.commit()
    return notification_data(record)
