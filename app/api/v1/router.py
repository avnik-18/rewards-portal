"""All /api/v1 routers mount here — keep imports flat, no side effects."""

from fastapi import APIRouter

from app.api.v1 import health, me, media, recognitions

api_router = APIRouter()
api_router.include_router(health.router)

api_router.include_router(me.router)
api_router.include_router(recognitions.router)
api_router.include_router(media.router)
