"""Immutable price observations and their original import audit."""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import JSON, Date, DateTime, ForeignKey, LargeBinary, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class PriceSeries(Base):
    __tablename__ = 'price_series'
    __table_args__ = (UniqueConstraint('commodity', 'locality_code', 'locality_name', 'quality', 'source_name',
                                      'source_url', 'dataset_kind', name='price_series_identity'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    commodity: Mapped[str] = mapped_column(String(120))
    locality_code: Mapped[str] = mapped_column(String(80))
    locality_name: Mapped[str] = mapped_column(String(120))
    quality: Mapped[str] = mapped_column(String(200))
    source_name: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str] = mapped_column(String(1000))
    dataset_kind: Mapped[str] = mapped_column(String(20))
    rights_basis: Mapped[str] = mapped_column(Text)


class PriceImport(Base):
    __tablename__ = 'price_imports'
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey('price_series.id'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    filename: Mapped[str] = mapped_column(String(200))
    sha256: Mapped[str] = mapped_column(String(64))
    original: Mapped[bytes] = mapped_column(LargeBinary)
    counts: Mapped[dict] = mapped_column(JSON)
    rows: Mapped[list] = mapped_column(JSON)


class PriceObservation(Base):
    __tablename__ = 'price_observations'
    __table_args__ = (UniqueConstraint('series_id', 'observed_on', name='price_observation_day'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    series_id: Mapped[int] = mapped_column(ForeignKey('price_series.id'), index=True)
    import_id: Mapped[int] = mapped_column(ForeignKey('price_imports.id'))
    observed_on: Mapped[date] = mapped_column(Date)
    price_vnd_per_kg: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source_document_url: Mapped[str] = mapped_column(String(1000))
