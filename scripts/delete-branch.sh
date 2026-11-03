#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== the stacked branch is fully contained in initial-backend -> remove it =="
git switch feature/initial-backend
git branch -D feature/dashboard-identity-stats
git push origin --delete feature/dashboard-identity-stats 2>&1 | tail -1
echo "== branches now =="
git ls-remote --heads origin | awk '{print $2}'
