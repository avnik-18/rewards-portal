#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== does feature/initial-backend already contain /me/stats + actor groundwork? =="
git show origin/feature/initial-backend:app/api/v1/me.py | grep -c 'me_stats\|MeStatsResponse' || echo 0
git show origin/feature/initial-backend:app/core/actor.py | head -4
echo
echo "== delta remaining on the stacked branch =="
git diff --stat origin/feature/initial-backend...feature/dashboard-identity-stats | tail -5
