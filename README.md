# recog-api

FastAPI backend for the emids rewards & recognition portal. One of three repos:
`recog-db` (schema design, in progress), `recog-api` (this), `rewards_recog` (front-end).

**Status: scaffold.** The walking skeleton is real (`/healthz`, `/api/v1/health`,
`/api/v1/demo/{name}`, `/api/v1/me`); all business services are stubs blocked on the
DB team's approved schema. See `CLAUDE.md` for the full stub map.

## Stack (team-mandated)

- FastAPI, async, layered: router → service → repository (single-purpose functions)
- Postgres via SQLAlchemy 2 (async) — **all schema changes via Alembic**, never by hand
- Microsoft Entra ID SSO; Outlook email via Microsoft Graph sendMail
- structlog + OpenTelemetry; Docker; pytest (90% floor as logic lands) + Playwright

## Local setup (Windows / PowerShell)

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
copy .env.example .env   # then fill values
```

## Run

```bash
docker compose up --build        # api + postgres (two containers)
```

Then: <http://localhost:8000/healthz> — and Swagger UI at <http://localhost:8000/docs>.

Without Docker (needs a local Postgres):

```bash
uvicorn app.main:app --reload
```

## Migrations

The approved schema has landed (recog-db workstream) — 18 Alembic revisions in
`alembic/versions/`, schema **owned by alembic + stored functions** (routing,
chain, money math and guards live in `fn_submit_recognition` / `fn_item_decide`
and friends — see `docs/db/design-source/README.md`).

```bash
alembic upgrade head        # build / update the database
bash scripts/db-verify.sh   # 44-check verification gate (core 22, edges 20, races 2)
```

**Autogenerate stays OFF** (`alembic/env.py` target_metadata=None): schema
edits are hand-written revisions running SQL — autogenerate against the
trigger/function-heavy DDL would silently damage the money core. Every new
revision follows the established "plain-SQL via the migration helper" shape.

## Recognition flow (first real endpoints)

```
POST /api/v1/recognitions                            # praise (auto-approve ≤100, chain >100)
POST /api/v1/recognitions/approval/{item}/decide     # approve / decline (+ note)
GET  /api/v1/recognitions/approvals/{approver_id}    # pending inbox rows
```
Errors come back as the DB's structured codes (`insufficient_points`,
`no_approval_route`, `double_refund_blocked`…) mapped to 409/422/404 — the
DB guarantees and the API surfaces, one contract.

## Quality gates

```bash
pytest -q          # unit + coverage
ruff check .       # lint
ruff format .      # format
mypy app           # strict types
bandit -r app      # SAST
trivy fs .         # SCA (if installed)
```

`pre-commit install` wires ruff/format/mypy/bandit/pytest into every commit.
(The team asked for "husky" — that's the Node-ecosystem tool; `pre-commit` is the
identical Python-ecosystem equivalent and is what this repo uses.)

## Verification

```bash
docker compose up --build
curl http://localhost:8000/healthz   # {"status":"ok","version":"0.1.0"}
pytest -q
```
