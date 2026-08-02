# StressSignal Deployment

StressSignal runs as an OpenNext application on Cloudflare Workers. Application
data is accessed through the native D1 `DB` binding; there is no PostgreSQL URL
in the application runtime.

## Cloudflare resources

| Resource | Value |
| --- | --- |
| Worker | `stresssignal` |
| Scheduler Worker | `stresssignal-scheduler` |
| Production route | `stresssignal.app/*` |
| D1 binding | `DB` |
| D1 database | `stresssignal-db` |
| D1 database ID | `682145ee-052a-4c94-8e68-5e30e4583964` |
| D1 jurisdiction | EU |
| Wrangler config | `wrangler.jsonc` |
| Scheduler config | `wrangler.scheduler.jsonc` |
| D1 migrations | `drizzle/d1` |

The Worker bundle is generated under `.open-next/`, which is intentionally
ignored by Git.

Generated social and icon PNGs are created at build time and uploaded as
Workers Static Assets. Keeping them out of the server bundle avoids shipping
the `next/og` renderer, fonts, and image-rendering WASM in every Worker version.

After building, verify the compressed Worker remains within the project's
2.5 MiB regression budget:

```bash
pnpm bundle:check
```

This budget leaves headroom below the Workers Free compressed-script limit.

## One-time Cloudflare setup

Wrangler must be authenticated and the following Worker secrets must be set in
Cloudflare. They are not committed to the repository. `CRON_SECRET` must have
the same value on the application Worker and the scheduler Worker because the
scheduler authenticates each private internal request with it.

```bash
pnpm exec wrangler secret put CRON_SECRET
pnpm exec wrangler secret put CRON_SECRET --config wrangler.scheduler.jsonc
```

The scheduler Worker is already provisioned in production. In a brand-new
Cloudflare account, provide `CRON_SECRET` on its initial deploy with Wrangler's
`--secrets-file` option, then use the commands above for later rotations.

`FRED_API_KEY` is optional and is not required by the production schedule.
`FRED_FETCH_TRANSPORT=graph_csv` makes the remaining FRED series use the public
CSV download, while VIX/VIX3M/VXN/RVX/VXD come directly from Cboe and
NFCI/ANFCI come directly from the Chicago Fed data API.

Optional runtime values such as `GOOGLE_ADSENSE_PUBLISHER_ID` can be added in
the Cloudflare dashboard or with `wrangler secret put`. The public site origin
is defined in `wrangler.jsonc` and is also supplied at build time so Next.js can
inline canonical URLs.

## Manual deployment

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
NEXT_PUBLIC_SITE_URL=https://stresssignal.app pnpm run deploy
```

`pnpm run deploy` builds the OpenNext Worker and deploys with `--keep-vars`, so
runtime variables and secrets configured in Cloudflare are preserved.

Deploy the small scheduler Worker separately after application endpoints or
schedule configuration change:

```bash
pnpm deploy:scheduler
```

The first Worker deployment creates a `workers.dev` endpoint. The production
Worker route is declared in `wrangler.jsonc`, so deploys attach the Worker in
front of the existing proxied `stresssignal.app` DNS record without replacing
that record. The `workers.dev` endpoint remains enabled as a rollback and
verification target.

## GitHub Actions

The `CI-CD` workflow validates pushes and pull requests targeting `test` or
`main`. It runs generated-file checks, lint, TypeScript, unit tests, local-D1
integration tests, an OpenNext Worker build, and a scheduler Worker dry run.

Only a push to `main` deploys the application Worker and then the scheduler
Worker. The `test` branch is validation-only until a separate staging D1
database is provisioned, preventing staging code from writing production data.

Required GitHub production secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Apply D1 migrations and deploy the Worker |
| `CLOUDFLARE_ACCOUNT_ID` | Select the Cloudflare account |

Worker runtime secrets such as `CRON_SECRET` remain in Cloudflare and are
preserved during CI deployments.

## Database migration and backup

Apply pending schema migrations before every deployment:

```bash
pnpm db:migrate
```

Create a recoverable D1 export before high-risk schema or data changes:

```bash
pnpm exec wrangler d1 export stresssignal-db \
  --remote \
  --output .d1-import/stresssignal-backup.sql
```

The one-off Neon exporter remains available during the rollback window:

```bash
pnpm db:export-neon
```

It consumes the source `DATABASE_URL` without printing it and writes an ignored
SQL file under `.d1-import/`. `DATABASE_URL` is not used by the Worker.

## Post-deploy checks

```bash
curl -I https://stresssignal.app
curl -sS https://stresssignal.app/api/v1/summary
curl -sS https://stresssignal.app/api/v1/indicators
curl -sS https://stresssignal.app/robots.txt
curl -sS https://stresssignal.app/sitemap.xml
```

The separate `stresssignal-scheduler` Worker has a Cron Trigger at `06:15 UTC`
every day. It runs the following chain through a private service binding to the
application Worker:

1. sync public sources;
2. sync CBOE sources;
3. sync the remaining FRED public-CSV sources;
4. recompute indicator snapshots;
5. revalidate data caches.

Each step is retried once for transient failures. A failed step does not prevent
later steps from running, but the Cron invocation is marked failed after the
chain completes so Workers Logs exposes the problem.
