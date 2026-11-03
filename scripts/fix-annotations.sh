#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'PYEOF'
import pathlib

p = pathlib.Path("app/schemas/recognition.py")
s = p.read_text(encoding="utf-8")
s = s.replace(
    "    @field_validator(\"to_user_ids\", \"cc_user_ids\")\n"
    "    @classmethod\n"
    "    def no_hidden_duplicates(cls, v: list[UUID], info) -> list[UUID]:",
    "    @field_validator(\"to_user_ids\", \"cc_user_ids\")\n"
    "    @classmethod\n"
    "    def no_hidden_duplicates(cls, v: list[UUID], info: ValidationInfo) -> list[UUID]:")
s = s.replace(
    "    @field_validator(\"to_user_ids\")\n"
    "    @classmethod\n"
    "    def to_and_cc_disjoint(cls, v: list[UUID], info) -> list[UUID]:",
    "    @field_validator(\"to_user_ids\")\n"
    "    @classmethod\n"
    "    def to_and_cc_disjoint(cls, v: list[UUID], info: ValidationInfo) -> list[UUID]:")
s = s.replace(
    "from pydantic import BaseModel, Field, field_validator",
    "from pydantic import BaseModel, Field, ValidationInfo, field_validator")
s = s.replace(
    "from pydantic import BaseModel, Field, field_validator",
    "from pydantic import BaseModel, Field, ValidationInfo, field_validator")
s = s.replace(
    "    @field_validator(\"message\", mode=\"before\")\n"
    "    @classmethod\n"
    "    def blank_ok(cls, v: object) -> object:",
    "    @field_validator(\"message\", mode=\"before\")\n"
    "    @classmethod\n"
    "    def blank_ok(cls, v: object) -> object:")
p.write_text(s, encoding="utf-8")
print("annotations done")
PYEOF
echo ok
