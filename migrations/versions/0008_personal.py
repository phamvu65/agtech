"""Private followed series and per-user risk-change/read state."""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"


def upgrade():
    op.create_table(
        "followings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("series_id", sa.Integer, sa.ForeignKey("price_series.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "series_id", name="following_owner_series"),
    )
    op.create_index("ix_followings_user_id", "followings", ["user_id"])
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assessment_id", sa.Integer, sa.ForeignKey("risk_assessments.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.UniqueConstraint("user_id", "assessment_id", name="notification_owner_assessment"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])


def downgrade():
    op.drop_table("notifications")
    op.drop_table("followings")
