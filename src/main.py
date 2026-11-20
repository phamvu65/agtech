from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine

from src.auth import router as auth_router
from src.collectors import router as collectors_router
from src.config import Settings, get_settings
from src.prices import router as prices_router
from src.references import router as references_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = create_engine(settings.database_url.get_secret_value(), pool_pre_ping=True)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        engine.dispose()

    app = FastAPI(title=settings.app_name, description="AGTECH-01", version="0.2.0", lifespan=lifespan)
    app.state.engine = engine
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
    )
    app.include_router(auth_router)
    app.include_router(prices_router)
    app.include_router(collectors_router)
    app.include_router(references_router)

    @app.get("/health")
    async def health():
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
