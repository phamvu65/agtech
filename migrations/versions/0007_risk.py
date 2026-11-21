"""Versioned fixture policies and append-only risk assessments."""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"


def upgrade():
    op.create_table(
        "risk_policies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("series_id", sa.Integer, sa.ForeignKey("price_series.id"), nullable=False),
        sa.Column("version", sa.String(80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("config", sa.JSON, nullable=False),
        sa.UniqueConstraint("series_id", "version", name="risk_policy_version"),
    )
    op.create_table(
        "risk_assessments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("series_id", sa.Integer, sa.ForeignKey("price_series.id"), nullable=False),
        sa.Column("forecast_id", sa.Integer, sa.ForeignKey("forecast_runs.id"), nullable=False),
        sa.Column("policy_id", sa.Integer, sa.ForeignKey("risk_policies.id")),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("as_of", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("level", sa.String(8)),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.UniqueConstraint("series_id", "idempotency_key", name="risk_idempotency"),
    )
    op.create_index("ix_risk_assessments_series_id", "risk_assessments", ["series_id"])


def downgrade():
    op.drop_table("risk_assessments")
    op.drop_table("risk_policies")
