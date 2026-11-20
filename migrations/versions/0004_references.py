"""Separate international/weather references with immutable import documents."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"


def upgrade():
    op.create_table(
        "reference_imports",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("series_id", sa.Integer, sa.ForeignKey("price_series.id"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw", sa.LargeBinary, nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("counts", sa.JSON, nullable=False),
        sa.Column("errors", sa.JSON, nullable=False),
    )
    op.create_table(
        "reference_observations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("series_id", sa.Integer, sa.ForeignKey("price_series.id"), nullable=False),
        sa.Column("import_id", sa.Integer, sa.ForeignKey("reference_imports.id"), nullable=False),
        sa.Column("identity", sa.String(64), nullable=False),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.UniqueConstraint("series_id", "identity", name="reference_identity"),
    )
    op.create_index("ix_reference_observations_series_id", "reference_observations", ["series_id"])


def downgrade():
    op.drop_table("reference_observations")
    op.drop_table("reference_imports")
