"""Generate SQLAlchemy declarative models in recog-api/app/models from the live schema.

Run with the applause alembic venv:
    /mnt/c/Users/syeda2/Desktop/recognition_portal/db/.venv/bin/python gen_models.py
Reads via psycopg2 from the applause-pg container (port 5433) DB `recog` and
writes mirrored Mapped[]-typed models. Always keep in sync with alembic/versions.
"""
from __future__ import annotations

import re
from collections import defaultdict

from sqlalchemy import MetaData, create_engine
from sqlalchemy.schema import Table

ENGINE = create_engine("postgresql+psycopg2://postgres:applause_dev@127.0.0.1:5433/recog")
OUT = "/mnt/c/Users/syeda2/Desktop/API_design/recog-api/app/models"

TYPE_MAP: dict[str, str] = {
    "uuid": "UUID",
    "character varying": "String",
    "text": "Text",
    "integer": "Integer",
    "bigint": "BigInteger",
    "smallint": "SmallInteger",
    "boolean": "Boolean",
    "timestamp with time zone": "DateTime",
    "date": "Date",
    "jsonb": "JSONB",
    "numeric": "Numeric",
}


def sqltype(t: str) -> str:
    t = t.strip()
    if t.endswith("[]"):
        return f"ARRAY({TYPE_MAP.get(t[:-2], 'Text')})"
    # native enums -> postgresql.ENUM
    if t.startswith("enum '"):
        return f"postgresqlENUM(name='{t[5:]}', create_type=False, checkfirst=True)"
    return TYPE_MAP.get(t, "Text")


def models_for_table(meta: MetaData, table: Table) -> dict[str, object]:
    ...  # replaced by writer below


def main() -> None:
    metadata = MetaData()
    metadata.reflect(bind=ENGINE)
    tables = {}
    for name, table in metadata.tables.items():
        tables[name] = table

    header = '''"""Applause database models — auto-generated mirror of alembic/versions/*.

NEVER hand-edit: the schema is owned by alembic revisions. Regenerate with
db/scripts/gen_models.py (recognition_portal workspace) after new revisions.
target_metadata for alembic autogenerate stays None on purpose (see alembic/env.py).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import (
    ARRAY,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM as postgresqlENUM
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


'''

    # one file per table
    import shutil
    import os
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT, exist_ok=True)

    grouped: dict[str, list] = defaultdict(list)
    for name, table in sorted(tables.items()):
        grouped[name[0].lower()].append(name)

    exports = []
    for prefix, names in sorted(grouped.items()):
        fname = ("__init__.py" if prefix == "_nameslug_" else None) or f"{prefix}.py"
        body = []
        for name in names:
            table: Table = tables[name]
            pyname = "".join(part.capitalize() for part in name.split("_"))
            cls = "\n".join([
                f"class {pyname}(Base):",
                f'    """{name} table."""',
                "    __tablename__ = %r" % name,
            ])
            for col in table.columns:
                line = build_column(col, table)
                cls += "\n    " + line
            for idx in table.indexes:
                pass
            cls += "\n"
            body.append(cls)
        header += "\n".join(body) + "\n\n"

    with open(f"{OUT}/schema.py", "w", encoding="utf-8") as f:
        f.write(header)
    print("wrote", f"{OUT}/schema.py")


def build_column(col: object, table: object) -> str:
    NullType = type(None)  # noqa: N806
    name = col.name
    ty = col.type
    type_repr = str(col.type)
    py = "str"
    sa = "Text"
    if not ty.python_type.__name__:
        py = "str"
        sa = "Text"
    return f"{name}: Mapped[Optional[{str(ty)}]] = mapped_column(...)"


if __name__ == "__main__":
    main()
