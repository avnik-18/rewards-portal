"""App factory — the single mount point for all routers."""

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.otel import setup_tracing


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=settings.version)
    setup_tracing(app)
    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> dict[str, str]:
        return {"status": "ok", "version": settings.version}

    return app


app = create_app()
