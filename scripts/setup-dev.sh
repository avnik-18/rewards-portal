#!/usr/bin/env bash
# Create .venv as the login user and install the project + dev tools; verify key bits.
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

rm -rf .venv/Scripts 2>/dev/null || true   # guard against wrong-venv leftovers, if any
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -e ".[dev]"
echo "== installed =="
.venv/bin/python --version
.venv/bin/pip --version
[ -x .venv/bin/uvicorn ] && echo "uvicorn: OK"
[ -x .venv/bin/alembic ] && echo "alembic: OK"
[ -x .venv/bin/pytest ] && echo "pytest: OK"
[ -x .venv/bin/ruff ] && echo "ruff: OK"

cp -n .env.example .env || true
echo "note: .env created from .env.example (points at the compose DB on localhost:5432)"
