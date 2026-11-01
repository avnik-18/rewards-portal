#!/bin/sh
cd /mnt/d/review/frontend
for i in 1 2 3; do
  npx vitest run --pool=threads --maxWorkers=1 > /tmp/vt-final-p.log 2>&1
  EXIT=$?
  if grep -q "Test Files" /tmp/vt-final-p.log && ! grep -q "no tests" /tmp/vt-final-p.log; then break; fi
done
echo "EXIT:$EXIT"
sed 's/\x1b\[[0-9;]*m//g' /tmp/vt-final-p.log > /tmp/vt-final-clean.log
grep -E "Test Files|Tests |Errors" /tmp/vt-final-clean.log | head -4
grep -c "✕\|×" /tmp/vt-final-clean.log || true
