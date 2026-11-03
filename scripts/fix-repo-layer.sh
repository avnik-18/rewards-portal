#!/usr/bin/env bash
set -euo pipefail
cd /mnt/c/Users/shouryac/Desktop/syed-recog-portal/recog-api

python3 - <<'EOF'
import pathlib

p = pathlib.Path("app/repositories/applause_repository.py")
s = p.read_text(encoding="utf-8")

# decide_approval: same treatment — bubble DBAPIError, no ValidationError wrap
s = s.replace('''    async def decide_approval(
        self,
        item: Any,
        decider: Any,
        approve: bool,
        note: str | None,
    ) -> str:
        """Call fn_item_decide; returns the post-decision approval_item.status."""
        try:
            await self._session.execute(
                text(
                    "SELECT fn_item_decide("
                    "CAST(:item AS uuid), CAST(:decider AS uuid), :approve, :note)"
                ),
                dict(item=item, decider=decider, approve=approve, note=note),
            )
        except sqlalchemy.exc.DBAPIError as e:
            raise ValidationError(str(e.orig)) from e''',
'''    async def decide_approval(
        self,
        item: Any,
        decider: Any,
        approve: bool,
        note: str | None,
    ) -> str:
        """Call fn_item_decide; returns the post-decision approval_item.status.

        DB failures propagate as raised (DBAPIError) — service translates."""
        await self._session.execute(
            text(
                "SELECT fn_item_decide("
                "CAST(:item AS uuid), CAST(:decider AS uuid), :approve, :note)"
            ),
            dict(item=item, decider=decider, approve=approve, note=note),
        )''')

# the now-dead ValidationError class + the sqlalchemy.exc import
s = s.replace('''class ValidationError(Exception):
    """Wraps fn_* SQL errors — services translate it into HTTPException."""
''', "")
s = s.replace("import sqlalchemy.exc\n", "")
p.write_text(s, encoding="utf-8")
print("repository translation layer removed")
EOF

docker exec recog-test-run bash -c "cd /srv && python -m pytest tests/ --no-cov -q --no-header 2>&1 | tail -4; ruff check app --output-format concise | tail -4; mypy app 2>&1 | tail -4"
