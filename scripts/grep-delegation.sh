#!/usr/bin/env bash
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
echo "== approval_delegation table definition (schema) =="
grep -n "approval_delegation" app/models/schema.py | head -4
docker exec recog-api-db-1 psql -U postgres -d recog -c "\d approval_delegation" 2>/dev/null | head -18 || echo "DB not running — reading from schema.py"
grep -n -A8 "class ApprovalDelegation" app/models/schema.py | head -14
