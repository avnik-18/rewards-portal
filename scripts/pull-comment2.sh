#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
gh pr view 1 --repo EMIDS-Data-AI-Engineering/rewards-portal-api --comments 2>&1 | sed -n '150,300p'
