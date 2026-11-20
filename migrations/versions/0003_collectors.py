"""Durable collector sources, jobs, audit and one active job per source."""
import sqlalchemy as sa
from alembic import op

revision = '0003'
down_revision = '0002'


def upgrade():
    op.create_table('collector_sources', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('series_id', sa.Integer, sa.ForeignKey('price_series.id'), nullable=False, unique=True),
        sa.Column('connector', sa.String(32), nullable=False),
        sa.Column('fixture_case', sa.String(32), nullable=False),
        sa.Column('enabled', sa.Boolean, nullable=False), sa.Column('interval_seconds', sa.Integer, nullable=False),
        sa.Column('next_run_at', sa.DateTime(timezone=True)),
        sa.Column('created_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False))
    op.create_table('collector_jobs', sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('source_id', sa.Integer, sa.ForeignKey('collector_sources.id'), nullable=False),
        sa.Column('requested_by', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
        sa.Column('trigger', sa.String(16), nullable=False), sa.Column('status', sa.String(16), nullable=False),
        sa.Column('queued_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True)), sa.Column('finished_at', sa.DateTime(timezone=True)),
        sa.Column('scheduled_for', sa.DateTime(timezone=True)),
        sa.Column('retry_of', sa.Integer, sa.ForeignKey('collector_jobs.id')),
        sa.Column('lease_token', sa.String(36)), sa.Column('lease_expires_at', sa.DateTime(timezone=True)),
        sa.Column('error', sa.Text), sa.Column('fetched_at', sa.DateTime(timezone=True)),
        sa.Column('http_status', sa.Integer), sa.Column('raw', sa.LargeBinary), sa.Column('raw_sha256', sa.String(64)),
        sa.Column('import_id', sa.Integer, sa.ForeignKey('price_imports.id')), sa.Column('events', sa.JSON, nullable=False))
    op.create_index('ix_collector_jobs_source_id', 'collector_jobs', ['source_id'])
    op.create_index('collector_one_active', 'collector_jobs', ['source_id'], unique=True,
                    postgresql_where=sa.text("status IN ('queued', 'running')"))


def downgrade():
    op.drop_table('collector_jobs')
    op.drop_table('collector_sources')
