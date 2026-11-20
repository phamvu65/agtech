"""Append-only forecasts with backtest/model/data lineage."""

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"


def upgrade():
    op.create_table(
        "forecast_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("series_id", sa.Integer, sa.ForeignKey("price_series.id"), nullable=False),
        sa.Column("backtest_id", sa.Integer, sa.ForeignKey("backtest_runs.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("as_of", sa.DateTime(timezone=True), nullable=False),
        sa.Column("mode", sa.String(16), nullable=False),
        sa.Column("payload", sa.JSON, nullable=False),
    )
    op.create_index("ix_forecast_runs_series_id", "forecast_runs", ["series_id"])


def downgrade():
    op.drop_table("forecast_runs")
