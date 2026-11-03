#!/usr/bin/env bash
set -euo pipefail
REPO=EMIDS-Data-AI-Engineering/rewards-portal-api

echo "== create tracking issues for the DB team =="
gh issue create --repo "$REPO" --title "fn_item_decide rewritten with delegation honoring + USING ERRCODE (recognition workstream)" --body "- [ ] fn_item_decide rewritten to honour approval_delegation (delegator_id == decider OR owner check) + USING ERRCODE C54917 (403) and C54921 (404)\n- [ ] fn_submit_recognition + fn_approve_recognition + fn_decline_recognition: all remaining RAISE EXCEPTION → USING ERRCODE\n- [ ] allowance check: SELECT ... FOR UPDATE before balance comparison\n- [ ] RAISE NOTICE: 13 debug lines across 0017/0019 removed\n- [ ] item_not_found uses ERRCODE C54920; person_not_found C54921; points_out_of_range C54906" --label "recognition-db" 2>&1 | head -2
gh issue create --repo "$REPO" --title "Outbox worker + notification decision" --body "- [ ] Decide whether notifications go through the outbox (recommended by the reviewer — Graph outage shouldn't fail a recognition) or stay inline\n- [ ] If outbox: add worker + drain logic in the API" --label "recognition-db" 2>&1 | head -2
echo "== done =="
