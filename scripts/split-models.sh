#!/usr/bin/env python3
"""Split app/models/schema.py into one module per bounded context."""
import pathlib, re

root = pathlib.Path("app/models")
text = (root / "schema.py").read_text(encoding="utf-8")

# shared header: imports + PgEnums (everything before class Base)
enums_end = text.index("class Base(DeclarativeBase):")
shared_header = text[:enums_end]

base_decl = "class Base(DeclarativeBase):\n    pass\n"

# extract every class block
pattern = re.compile(r"(class \w+\(Base\):.*?)(?=class \w+\(Base\):|\Z)", re.S)
classes = {}
for m in pattern.finditer(text[enums_end:]):
    block = m.group(1).rstrip() + "\n"
    name = re.search(r"class (\w+)\(Base\):", block).group(1)
    classes[name] = block

BOUNDED = {
    "people.py": ["Users", "Teams", "TeamMembers", "RoleAssignment", "ApprovalDelegation"],
    "money.py": ["FiscalPeriod", "BudgetPolicy", "ToRecogPoints", "PointsWallet", "LedgerAccount", "JournalEntry", "JournalLine", "Ledger"],
    "recognition.py": ["EmidsValues", "RecognitionTemplates", "RecognitionHistory", "RecognitionRecipients", "RecognitionPending"],
    "approvals.py": ["ApprovalRule", "ApprovalRuleStep", "ApprovalItem", "ApprovalItemStep"],
    "awards.py": ["Awards", "AwardsNominations", "JuryAssignment", "Ballot"],
    "system.py": ["Notification", "OutboxEvent", "AdminSettingKey", "AdminSetting", "MilestoneRule", "AuditLog"],
}


def sa_types(block: str) -> str:
    names = sorted(set(re.findall(r"\b(BigInteger|Boolean|CheckConstraint|Date|DateTime|ForeignKey|SmallInteger|String|Text|UniqueConstraint|text)\b", block)))
    return ", ".join(names)


tmpl = '''"""Applause database models — {title} bounded context."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import (
{types},
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

'''

# base.py: shared enums + Base
(root / "base.py").write_text(shared_header + base_decl + "\n", encoding="utf-8")
print("wrote base.py")

all_names = []
for fname, cls_names in BOUNDED.items():
    p = root / fname
    block_text = "\n\n".join(classes[cn] for cn in cls_names if cn in classes)
    module = tmpl.format(title=fname.replace(".py", ""), types=sa_types(block_text)) + block_text
    p.write_text(module + "\n", encoding="utf-8")
    all_names.extend(cls_names)
    print(f"wrote {fname} ({len(module)} chars)")

import_lines = []
for fname, cls_names in BOUNDED.items():
    mod = fname.replace(".py", "")
    for cn in cls_names:
        import_lines.append(f"from .{mod} import {cn}")

init = "from __future__ import annotations\n\n" + "\n".join(import_lines) + "  # noqa: F401\n\nfrom .base import Base  # noqa: F401\n\n__all__ = [" + ", ".join(f'"{n}"' for n in sorted(set(all_names))) + ', "Base"]\n'
(root / "__init__.py").write_text(init, encoding="utf-8")
print("wrote __init__.py")

(root / "schema.py").unlink()
print("deleted schema.py")
