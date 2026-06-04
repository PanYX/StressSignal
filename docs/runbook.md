# Market Risk Dashboard Runbook (T-011)

## 1. Environment variables

Set these in `.env.local` before running commands. Treat `.env.local` as
sensitive and do not print or commit it.

- `NEXT_PUBLIC_SITE_URL`: Public site origin for metadata and canonical links (for local testing usually `http://127.0.0.1:3000`).
- `DATABASE_URL`: Remote PostgreSQL DSN used by Next.js, Drizzle, and scripts.
- `FRED_API_KEY`: FRED API key for the sync endpoint. In tests we use synthetic/mock fetch and do not require a real key.
- `CRON_SECRET`: Shared secret for internal routes `POST /api/internal/sync/fred`, `POST /api/internal/compute-snapshots`, `POST /api/internal/revalidate`.

## 2. Database setup

This project now uses the remote PostgreSQL database configured by
`DATABASE_URL`. Do not start or rely on the old local Docker PostgreSQL
database for application data.

## 3. Install dependencies and migration

```bash
pnpm install

# apply schema migrations
pnpm run db:migrate

# seed indicator metadata
pnpm seed:indicators
```

## 4. Optional synthetic/local data path

For local/manual smoke, seed helper scripts that do not call remote APIs are available:

- `scripts/.tmp-t007-seed-observations.ts` (transient local helper used by earlier test runs)
- `tests/fixtures/fred/*.json` for integration-style mocked payloads

Typical local smoke flow with synthetic data:

```bash
pnpm exec tsx scripts/.tmp-t007-seed-observations.ts
pnpm exec tsx scripts/recompute-snapshots.ts --write
```

E2E tests use this same flow in their global setup to guarantee deterministic page assertions.

## 5. Live data sync and compute flow

From local machine (real data):

```bash
# 1) sync observations from FRED
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${NEXT_PUBLIC_SITE_URL}/api/internal/sync/fred"

# 2) recompute snapshots
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${NEXT_PUBLIC_SITE_URL}/api/internal/compute-snapshots"

# 3) refresh route-level caches
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d '{"tags":["market-risk-dashboard","indicators"]}' \
  "${NEXT_PUBLIC_SITE_URL}/api/internal/revalidate"
```

## 6. API smoke checks

- `GET /api/v1/summary`
- `GET /api/v1/indicators`
- `GET /api/v1/indicators/vix`
- `GET /api/v1/commentary`

All should return JSON and `200` when data is available.

## 7. Required tests

```bash
pnpm run lint
pnpm run build
pnpm exec vitest run
pnpm exec playwright test
pnpm exec next lint
```

Note: `pnpm exec next lint` currently fails because the installed Next.js CLI no longer exposes a `lint` command (`next 16.2.6`); use `pnpm run lint` for lint verification in this environment.

Equivalent npm scripts for local CI parity:

```bash
pnpm test        # vitest all (unit + integration)
pnpm test:integration # targeted integration tests
pnpm test:e2e    # playwright smoke
```

These should execute against an isolated database as part of local run scripts.

If browser binaries are missing, install once for Playwright:

```bash
pnpm exec playwright install
```

## 8. Acceptance notes

- MVP intentionally excludes high-risk/uncertain-license sources:
  - MOVE, High Yield OAS, Put/Call Ratio, VVIX, SKEW
  - These remain in deferred/approval state and are not in public MVP pages.
- All user-visible pages include non-investment advice disclaimer blocks:
  - "风险提示：... 不构成投资建议。"
  - `DisclaimerText` is used on pages and article detail sections.
