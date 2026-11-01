#!/bin/sh
cd /mnt/d/review
git add -A
git commit -m "feat(frontend): full Next.js portal as frontend/ — App Router, atomic components, 134 tests (unit/integration/a11y/e2e), husky gate, share flow, renamed from web/" > /tmp/cmt.log 2>&1
echo "COMMIT_EXIT:$?"
tail -4 /tmp/cmt.log
