# Rewards & Recognition Portal — Frontend

Next.js 15 App Router frontend for the emids Rewards & Recognition portal,
built with atomic components (atoms → molecules → organisms), server
rendering, and a single data-façade module (`lib/data-api.ts`) ready to swap
to FastAPI endpoints.

## Run

```bash
npm install
npm run dev      # http://localhost:3000 (Turbopack)
```

## Quality

```bash
npm run test            # Vitest: unit + integration + axe-core accessibility
npm run test:coverage   # 90% thresholds enforced in vitest.config.ts
npm run e2e             # Playwright real-browser flows
npm run lint / npm run format:check

# pre-commit gate (husky): ESLint → Prettier → Trivy SCA → Vitest
```

## Structure

```
app/          App Router pages (/, /recognize, /approvals, /team, /rewards, /profile)
components/   atoms → molecules → organisms
lib/          data-api façade, mock data, pure helpers (approval/rewards/linkedin)
hooks/        useComposeForm, useApprovals
tests/        unit/<page> · integration/<page> · a11y/<page> · e2e/
```
