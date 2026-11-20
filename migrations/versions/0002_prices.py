"""Price series, immutable source files, observations and row results."""
import sqlalchemy as sa
from alembic import op

revision = '0002'
down_revision = '0001'


def upgrade():
    op.create_table('price_series', sa.Column('id', sa.Integer, primary_key=True),
                    sa.Column('commodity', sa.String(120), nullable=False),
                    sa.Column('locality_code', sa.String(80), nullable=False),
                    sa.Column('locality_name', sa.String(120), nullable=False),
                    sa.Column('quality', sa.String(200), nullable=False),
                    sa.Column('source_name', sa.String(200), nullable=False),
                    sa.Column('source_url', sa.String(1000), nullable=False),
                    sa.Column('dataset_kind', sa.String(20), nullable=False),
                    sa.Column('rights_basis', sa.Text, nullable=False),
                    sa.UniqueConstraint('commodity', 'locality_code', 'locality_name', 'quality', 'source_name',
                                        'source_url', 'dataset_kind', name='price_series_identity'))
    op.create_table('price_imports', sa.Column('id', sa.Integer, primary_key=True),
                    sa.Column('series_id', sa.Integer, sa.ForeignKey('price_series.id'), nullable=False),
                    sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id'), nullable=False),
                    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('filename', sa.String(200), nullable=False),
                    sa.Column('sha256', sa.String(64), nullable=False),
                    sa.Column('original', sa.LargeBinary, nullable=False),
                    sa.Column('counts', sa.JSON, nullable=False), sa.Column('rows', sa.JSON, nullable=False))
    op.create_table('price_observations', sa.Column('id', sa.Integer, primary_key=True),
                    sa.Column('series_id', sa.Integer, sa.ForeignKey('price_series.id'), nullable=False),
                    sa.Column('import_id', sa.Integer, sa.ForeignKey('price_imports.id'), nullable=False),
                    sa.Column('observed_on', sa.Date, nullable=False),
                    sa.Column('price_vnd_per_kg', sa.Numeric(14, 2), nullable=False),
                    sa.Column('published_at', sa.DateTime(timezone=True)),
                    sa.Column('collected_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('source_document_url', sa.String(1000), nullable=False),
                    sa.UniqueConstraint('series_id', 'observed_on', name='price_observation_day'))
    op.create_index('ix_price_observations_series_id', 'price_observations', ['series_id'])


def downgrade():
    op.drop_table('price_observations')
    op.drop_table('price_imports')
    op.drop_table('price_series')
