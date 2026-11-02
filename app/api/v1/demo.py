"""Walking-skeleton route — copy this shape for every future endpoint.

Router (this file): validate input / DTOs only. No logic, no SQL.
"""

from fastapi import APIRouter

from app.schemas.demo import DemoResponse
from app.services.demo_service import build_greeting

router = APIRouter(tags=["demo"])


@router.get("/demo/{name}")
def demo_from_template(name: str) -> DemoResponse:
    return DemoResponse(name=name, message=build_greeting(name))
