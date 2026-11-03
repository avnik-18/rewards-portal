#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
REPO=EMIDS-Data-AI-Engineering/rewards-portal-api
echo "== inline review comments (pratheesh) =="
gh api "repos/$REPO/pulls/1/comments" --paginate --jq '.[] | select(.user.login=="pratheesh-emids") | "【\(.path):\(.line // .original_line // "?")】\(.body)\n"' 2>&1 | head -200
