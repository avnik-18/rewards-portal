// One-shot converter: runs each node-pg-migrate file against a stub `pgm`
// that RECORDS the exact SQL/operations, then emits Alembic revisions.
const fs = require('fs');
const path = require('path');

const MIGDIR = path.join(__dirname, '..', 'migrations');
const OUTDIR = path.join(__dirname, '..', 'alembic', 'versions');
fs.mkdirSync(OUTDIR, { recursive: true });

const files = fs.readdirSync(MIGDIR).filter(f => /^\d{4}_.*\.js$/.test(f)).sort();
const revisions = [];

function fakePgm(log, kind) {
  return {
    sql: (s) => log.push({ kind, sql: s.replace(/\s*;\s*$/, '') }),
    createType: (name, values) => log.push({
      kind,
      sql: `CREATE TYPE ${name} AS ENUM (${values.map(v => `'${v}'`).join(', ')});`,
    }),
    dropType: (name) => log.push({ kind, sql: `DROP TYPE IF EXISTS ${name};` }),
  };
}

for (const file of files) {
  const mod = require(path.join(MIGDIR, file));
  const up = [], down = [];
  mod.up(fakePgm(up, 'up'));
  const threwOnDown = (() => { try { mod.down && mod.down(fakePgm(down, 'down')); return false; } catch (e) { if (down.length === 0) throw e; return false; } })();
  revisions.push({ id: file.replace('.js', ''), file, up, down, threwOnDown });
}

const esc = (s) => s.replace(/"""/g, '\\"\\"\\"');

let prev = null;
for (const r of revisions) {
  const body = (ops, indent) => ops.length === 0
    ? `${indent}pass`
    : ops.map(o => `${indent}op.execute(r"""${esc(o.sql)}""")`).join('\n');
  const py = `"""${r.file} — Alembic revision (converted once from the design workspace; maintain the emitted copy in the repo)

Run order note: SQL statements execute in their original node-pg-migrate order.
"""
from alembic import op

revision = "${r.id}"
down_revision = ${prev ? JSON.stringify(prev.id) : 'None'}
branch_labels = None
depends_on = None

def upgrade() -> None:
${body(r.up, '    ')}

def downgrade() -> None:
${body(r.down, '    ')}
`;
  fs.writeFileSync(path.join(OUTDIR, r.id + '.py'), py);
  prev = r;
}
console.log('emitted', revisions.length, 'revisions to', OUTDIR);
