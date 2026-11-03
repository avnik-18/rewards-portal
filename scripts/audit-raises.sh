#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== files with fns + RAISEs =="
grep -ln "RAISE" alembic/versions/*.py
echo
echo "== every RAISE with its line =="
grep -n "RAISE" alembic/versions/0013_fn_flows.py alembic/versions/0015_staff_fn.py alembic/versions/0016_step_level.py alembic/versions/0017_admin_flows.py | head -60
