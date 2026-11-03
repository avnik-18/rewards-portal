#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api
docker rm -f recog-ch >/dev/null 2>&1 || true
git add -A
git commit -q -m "refactor(models): split schema.py (557 loc) into bounded-context modules (review)

Split by the ADR-v2 bounded-context boundaries as per the reviewer ask:
- base.py: Base + all PgEnums shared by every module
- people.py: Users, Teams, TeamMembers, RoleAssignment, ApprovalDelegation
- money.py: FiscalPeriod, BudgetPolicy, ToRecogPoints, PointsWallet,
  LedgerAccount, JournalEntry, JournalLine, Ledger
- recognition.py: EmidsValues, RecognitionTemplates, RecognitionHistory,
  RecognitionRecipients, RecognitionPending
- approvals.py: ApprovalRule, ApprovalRuleStep, ApprovalItem, ApprovalItemStep
- awards.py: Awards, AwardsNominations, JuryAssignment, Ballot
- system.py: Notification, OutboxEvent, AdminSettingKey, AdminSetting,
  MilestoneRule, AuditLog
- __init__.py re-exports everything so no imports change

Verified: all models import OK, 23/23 tests green.
Remaining ruff: 5 E501 (long FK lines) — cosmetic, left for the next ruff fix pass.
"
git log --oneline -2
git push origin feature/initial-backend 2>&1 | tail -2
