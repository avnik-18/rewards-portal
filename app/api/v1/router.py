"""All /api/v1 routers mount here — keep imports flat, no side effects."""

from fastapi import APIRouter

from app.api.v1 import (
    admin_awards,
    awards,
    awards_cycles,
    celebrations,
    demo_users,
    directory,
    feed,
    health,
    leaderboard,
    me,
    media,
    media_admin,
    nominations,
    notifications,
    notifications_list,
    recognitions,
    showcase,
    uploads,
    values,
)

api_router = APIRouter()
api_router.include_router(health.router)

# Login screen's demo-identity dropdown — before the actor-scoped mounts.
api_router.include_router(demo_users.router)

api_router.include_router(me.router)
api_router.include_router(recognitions.router)
api_router.include_router(media.router)
# Admin console — hero/banner media registry + feed-post moderation ops
api_router.include_router(media_admin.router)

# Dashboard deliverables 4-6 — leaderboard, awards showcase, badge count
api_router.include_router(leaderboard.router)
api_router.include_router(showcase.router)
# Admin-authored awards catalog — the /awards list behind the leader tab
api_router.include_router(awards.router)
# Admin console — cycles & categories (Work Item #1); persona-gated routes
api_router.include_router(admin_awards.router)
# "Award cycles" section + nomination submission (Work Item #3)
api_router.include_router(awards_cycles.router)
# Excellence nomination compose lifecycle (team's myteam-nominations merge
# — draft → our awards-lane approval chain)
api_router.include_router(nominations.router)
api_router.include_router(notifications.router)
# Bell panel list + mark-read (deliverable #6 depth)
api_router.include_router(notifications_list.router)

# Post-login recognition feed — persona-segmented, tiered with keyset cursors
api_router.include_router(feed.router)

# "Recognize a Teammate" — read path (directory picker + values catalog)
api_router.include_router(directory.router)
api_router.include_router(values.router)

# Supporting-document file uploads (compose) — reads happen through /files
api_router.include_router(uploads.router)

# Upcoming birthdays + work anniversaries — relevant people per viewer
api_router.include_router(celebrations.router)
