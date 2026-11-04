#!/usr/bin/env bash
set -e
cd /mnt/d/recognition/frontend
git add -A
git commit -m "fix(review): PR #1 batch 2 — mock-ban lint rule, hook split, a11y and send-failure fixes, CSP baseline, descriptive constants, 125 tests green"
git log --oneline -2
git status -s | wc -l
