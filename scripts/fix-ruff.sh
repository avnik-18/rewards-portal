#!/usr/bin/env bash
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
awk 'length($0)>100 {print FILENAME": "NR}' tests/integration/test_identity_stats.py || true
grep -n "PG_DB={PG_DB!r}" tests/integration/test_identity_stats.py || true
grep -n "recognitions_received\"\] + 1" tests/integration/test_identity_stats.py || true
