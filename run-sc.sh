#!/bin/sh
cd /mnt/d/review/frontend
npx vitest run tests/integration/rewards/share-composer --pool=threads --maxWorkers=1 > /tmp/sc.log 2>&1
echo "EXIT:$?"
sed 's/\x1b\[[0-9;]*m//g' /tmp/sc.log > /tmp/sc-clean.log
grep -c "" /tmp/sc-clean.log
