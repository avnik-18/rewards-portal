#!/usr/bin/env bash
set -uo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== files using the raw_connection pattern =="
grep -l "raw_connection" alembic/versions/*.py | wc -l
echo "== statements that CANNOT run inside a transaction (would legitimately need the old pattern) =="
grep -inE 'CONCURRENTLY|ALTER TYPE|REFRESH MATERIALIZED|VACUUM|CREATE EVENT|CREATE POLICY|REASSIGN|DROP OWNED' alembic/versions/*.py || echo "none found — all DDL is transaction-safe"
echo "== whether any file commits mid-flight or uses SAVEPOINT-level control =="
grep -n "raw.commit()" alembic/versions/*.py | wc -l
echo "== FILES: who claims 'do not edit' =="
grep -l "do not edit" alembic/versions/*.py | wc -l
