"""All /api/v1 routers mount here — keep imports flat, no side effects."""

from fastapi import APIRouter

from app.api.v1 import (
    awards,
    celebrations,
    demo_users,
    directory,
    feed,
    health,
    leaderboard,
    me,
    media,
    notifications,
    notifications_list,
    recognitions,
    showcase,
    values,
)

api_router = APIRouter()
api_router.include_router(health.router)

# Login screen's demo-identity dropdown — before the actor-scoped mounts.
api_router.include_router(demo_users.router)

api_router.include_router(me.router)
api_router.include_router(recognitions.router)
api_router.include_router(media.router)

# Dashboard deliverables 4-6 — leaderboard, awards showcase, badge count
api_router.include_router(leaderboard.router)
api_router.include_router(showcase.router)
# Admin-authored awards catalog — the /awards list behind the leader tab
api_router.include_router(awards.router)
api_router.include_router(notifications.router)
# Bell panel list + mark-read (deliverable #6 depth)
api_router.include_router(notifications_list.router)

# Post-login recognition feed — persona-segmented, tiered with keyset cursors
api_router.include_router(feed.router)

# "Recognize a Teammate" — read path (directory picker + values catalog)
api_router.include_router(directory.router)
api_router.include_router(values.router)

# Upcoming birthdays + work anniversaries — relevant people per viewer
api_router.include_router(celebrations.router)
