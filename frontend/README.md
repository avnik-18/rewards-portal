# Rewards & Recognition — frontend (plain React + Vite)

Client-rendered React 19 + React Router + Vite build of the portal. Sample data
resolves from the mock façade; when the FastAPI backend lands, only `lib/data-api*`
changes — components stay untouched.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

Environment values are read via `import.meta.env` — see `.env.example`
(`VITE_RECOGNITION_BASE_URL` and friends; copy to `.env.local`).

## Quality

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` over src/, components/, lib/, hooks/, tests/ |
| `npm run lint` | ESLint (typed linting, naming convention, max-lines, mock-data ban) |
| `npm run test` | Vitest unit + integration + axe a11y |
| `npm run test:coverage` | Same suite with the 90% coverage gate |
| `npm run e2e` | Playwright chromium against the dev server |
| `npm run scan:sca` | Trivy fs scan (HIGH/CRITICAL fail, CI) |
| `npm run build` | `tsc -b` + `vite build` → `dist/` |

Husky pre-commit runs ESLint → Prettier → Trivy (when installed) → full Vitest suite.

## Deploy

```bash
npm run build      # emits dist/
docker build -t rewards-portal-web .   # multi-stage: vite build → nginx:alpine
```

`nginx.conf` carries the enterprise security headers (CSP, HSTS,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy) and the SPA
fallback (`try_files $uri /index.html`) so deep links like `/team` never 404.
