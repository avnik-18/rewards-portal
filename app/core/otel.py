"""OpenTelemetry tracing — inert unless OTLP_ENDPOINT is configured."""

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)


def setup_tracing(app: FastAPI) -> None:
    endpoint = get_settings().otlp_endpoint
    if not endpoint:
        log.info("otel.disabled", reason="OTLP_ENDPOINT not set")
        return

    # TODO (monitoring stack): wire OTLP span exporter + resource attributes.
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(app)
    log.info("otel.enabled", endpoint=endpoint)
