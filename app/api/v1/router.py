"""All /api/v1 routers mount here — keep imports flat, no side effects."""

from fastapi import APIRouter

from app.api.v1 import (
    directory,
    health,
    leaderboard,
    me,
    media,
    notifications,
    recognitions,
    showcase,
    values,
)

api_router = APIRouter()
api_router.include_router(health.router)

api_router.include_router(me.router)
api_router.include_router(recognitions.router)
api_router.include_router(media.router)

# Dashboard deliverables 4-6 — leaderboard, awards showcase, badge count
api_router.include_router(leaderboard.router)
api_router.include_router(showcase.router)
api_router.include_router(notifications.router)

# "Recognize a Teammate" — read path (directory picker + values catalog)
api_router.include_router(directory.router)
api_router.include_router(values.router)
