"""Immutable alert diagnostic reports with full-window coverage accounting."""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"


def upgrade():
    op.create_table(
        "risk_validation_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("backtest_id", sa.Integer, sa.ForeignKey("backtest_runs.id"), nullable=False),
        sa.Column("policy_id", sa.Integer, sa.ForeignKey("risk_policies.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("report", sa.JSON, nullable=False),
    )


def downgrade():
    op.drop_table("risk_validation_runs")
