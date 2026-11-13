"""App factory — the single mount point for all routers."""

from collections.abc import Awaitable, Callable

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.api.v1.me import me_missing_handler
from app.api.v1.recognitions import recognition_domain_handler
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.otel import setup_tracing
from app.core.security import require_identity_configured
from app.services.me_service import MeRepositoryMissing
from app.services.recognition_service import RecognitionDomainError

log = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()
    # fail-closed identity (reviewer auth comment): the app refuses to start
    # without an explicit identity configuration — no silent dev fallback in
    # a deployed environment.
    require_identity_configured()
    swagger_public = settings.environment == "local"
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        docs_url="/docs" if swagger_public else None,
        redoc_url="/redoc" if swagger_public else None,
        openapi_url="/openapi.json" if swagger_public else None,
    )
    setup_tracing(app)
    app.include_router(api_router, prefix=settings.api_prefix)
    # fn_* business failures -> 409/422/404 in ONE place, for every raise site
    app.add_exception_handler(RecognitionDomainError, recognition_domain_handler)
    app.add_exception_handler(MeRepositoryMissing, me_missing_handler)
    # Host-header validation driven by config: explicit list outside local
    # (the start-up guard refuses to boot otherwise); local defaults to "*"
    # for dev convenience.
    trusted_host_names = [h.strip() for h in settings.allowed_hosts.split(",") if h.strip()]
    if not trusted_host_names:
        trusted_host_names = ["*"]  # reached only in local (guarded at boot)
    # security middleware (reviewer hardening)

    @app.middleware("http")
    async def security_headers(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Cache-Control", "no-store")
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
        return response

    if settings.cors_origins:
        origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
        app.add_middleware(CORSMiddleware, allow_origins=origins,
                           allow_methods=["GET", "POST", "PATCH", "DELETE"],
                           allow_headers=["X-Demo-User", "Authorization", "Idempotency-Key", "Content-Type"])
    else:
        log.warning("cors.no_origins_configured")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_host_names)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> dict[str, str]:
        return {"status": "ok"}
    return app


app = create_app()
