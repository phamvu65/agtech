"""Identity and opaque revocable sessions."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade():
    op.create_table("users", sa.Column("id", sa.Integer, primary_key=True),
                    sa.Column("username", sa.String(80), nullable=False, unique=True),
                    sa.Column("password_hash", sa.String(512), nullable=False),
                    sa.Column("role", sa.String(16), nullable=False),
                    sa.Column("active", sa.Boolean, nullable=False),
                    sa.CheckConstraint("role IN ('admin', 'observer')", name="user_role"))
    op.create_table("user_sessions", sa.Column("token_hash", sa.String(64), primary_key=True),
                    sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
                    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])


def downgrade():
    op.drop_table("user_sessions")
    op.drop_table("users")
