#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-bandit >/dev/null 2>&1 || true
docker run --rm --network host -v "$PWD:/srv" -w /srv python:3.12-slim \
  bash -c "pip install -q bandit && bandit -r app -f txt 2>&1 | grep -E 'Issue|Severity|Location|B1' | head -12"
