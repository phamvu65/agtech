from alembic import context
from sqlalchemy import create_engine

from src import analysis, collector_models, forecasts, price_models, references, risk  # noqa: F401
from src.config import Settings
from src.database import Base

engine = create_engine(Settings().database_url.get_secret_value())
with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
engine.dispose()
