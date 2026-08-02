# Market Risk Dashboard Runbook

## 1. Runtime configuration

The application uses the D1 `DB` binding from `wrangler.jsonc`. It does not need
or accept a PostgreSQL connection URL at runtime.

Relevant environment variables:

- `NEXT_PUBLIC_SITE_URL`: public origin used for canonical and social URLs.
- `FRED_API_KEY`: required in the production Worker; FRED's public graph CSV
  remains a fallback but can reject Cloudflare egress.
- `FRED_FETCH_TRANSPORT`: `auto`, `api_json`, or `graph_csv`.
- `CRON_SECRET`: bearer token for internal sync, compute, and revalidate routes.

Treat `.env.local` as sensitive. Its old `DATABASE_URL` is only a temporary
source for the one-off Neon export command during the rollback window.

## 2. Local D1 development

Local development is isolated from production by default:

```bash
pnpm install
pnpm db:migrate:local
pnpm seed:indicators:local
pnpm dev
```

Wrangler stores local D1 state under `.wrangler/`. To deliberately read the
remote production D1 while running Next locally:

```bash
STRESSSIGNAL_D1_REMOTE=true pnpm dev
```

Do not call write-capable internal routes in remote mode unless a production
update is intended.

## 3. Production D1 operations

```bash
# Apply schema changes
pnpm db:migrate

# Read metadata counts
pnpm exec tsx scripts/check-seed-counts.ts

# Update configured indicator/source metadata in remote D1
pnpm seed:indicators
```

The sync and recompute scripts target remote D1 explicitly:

```bash
pnpm sync:fred
pnpm sync:public-sources
pnpm exec tsx scripts/sync-cboe.ts
pnpm exec tsx scripts/recompute-snapshots.ts --write
```

## 4. API-triggered sync flow

```bash
curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${NEXT_PUBLIC_SITE_URL}/api/internal/sync/fred"

curl -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${NEXT_PUBLIC_SITE_URL}/api/internal/compute-snapshots"

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d '{"tags":["market-risk-dashboard","indicators"]}' \
  "${NEXT_PUBLIC_SITE_URL}/api/internal/revalidate"
```

## 5. Database verification

```bash
pnpm exec wrangler d1 execute stresssignal-db --remote --command \
  "SELECT COUNT(*) AS indicators FROM indicators;
   SELECT COUNT(*) AS indicator_sources FROM indicator_sources;
   SELECT COUNT(*) AS observations FROM observations;
   SELECT COUNT(*) AS indicator_snapshots FROM indicator_snapshots;
   SELECT COUNT(*) AS sync_runs FROM sync_runs;
   SELECT COUNT(*) AS daily_commentaries FROM daily_commentaries;"
```

Use `PRAGMA foreign_key_check;` after imports or relationship-changing
migrations. Export a D1 backup before destructive operations.

## 6. Required verification

```bash
pnpm content:check
pnpm cf:typecheck
pnpm lint
pnpm exec tsc --noEmit
pnpm test:unit
pnpm test:integration
pnpm test:e2e
NEXT_PUBLIC_SITE_URL=https://stresssignal.app \
  pnpm exec opennextjs-cloudflare build
```

E2E tests build an OpenNext Worker and use an isolated, disposable local D1.
They do not start PostgreSQL or write the remote D1 database.
