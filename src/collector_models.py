"""Durable collector configuration and execution history."""
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, LargeBinary, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class CollectorSource(Base):
    __tablename__ = 'collector_sources'
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey('price_series.id'), unique=True)
    connector: Mapped[str] = mapped_column(String(32))
    fixture_case: Mapped[str] = mapped_column(String(32), default='valid')
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    interval_seconds: Mapped[int] = mapped_column(default=3600)
    next_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[int] = mapped_column(ForeignKey('users.id'))


class CollectorJob(Base):
    __tablename__ = 'collector_jobs'
    __table_args__ = (
        Index('collector_one_active', 'source_id', unique=True,
              postgresql_where=text("status IN ('queued', 'running')")),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey('collector_sources.id'), index=True)
    requested_by: Mapped[int] = mapped_column(ForeignKey('users.id'))
    trigger: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16))
    queued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retry_of: Mapped[int | None] = mapped_column(ForeignKey('collector_jobs.id'))
    lease_token: Mapped[str | None] = mapped_column(String(36))
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    http_status: Mapped[int | None]
    raw: Mapped[bytes | None] = mapped_column(LargeBinary)
    raw_sha256: Mapped[str | None] = mapped_column(String(64))
    import_id: Mapped[int | None] = mapped_column(ForeignKey('price_imports.id'))
    events: Mapped[list] = mapped_column(JSON, default=list)
