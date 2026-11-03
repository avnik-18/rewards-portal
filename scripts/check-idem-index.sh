#!/usr/bin/env bash
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker exec recog-api-db-1 psql -U postgres -d recog -c "\d recognition_history" 2>&1 | grep -iE "index|unique|idempot"
docker exec recog-api-db-1 psql -U postgres -d recog -c "SELECT indexdef FROM pg_indexes WHERE tablename='recognition_history';"
