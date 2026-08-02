# StressSignal Deployment

StressSignal runs as an OpenNext application on Cloudflare Workers. Application
data is accessed through the native D1 `DB` binding; there is no PostgreSQL URL
in the application runtime.

## Cloudflare resources

| Resource | Value |
| --- | --- |
| Worker | `stresssignal` |
| Production route | `stresssignal.app/*` |
| D1 binding | `DB` |
| D1 database | `stresssignal-db` |
| D1 database ID | `682145ee-052a-4c94-8e68-5e30e4583964` |
| D1 jurisdiction | EU |
| Wrangler config | `wrangler.jsonc` |
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
Cloudflare. They are not committed to the repository.

```bash
pnpm exec wrangler secret put CRON_SECRET
pnpm exec wrangler secret put FRED_API_KEY
```

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

The first Worker deployment creates a `workers.dev` endpoint. The production
Worker route is declared in `wrangler.jsonc`, so deploys attach the Worker in
front of the existing proxied `stresssignal.app` DNS record without replacing
that record. The `workers.dev` endpoint remains enabled as a rollback and
verification target.

## GitHub Actions

The `CI-CD` workflow validates pushes and pull requests targeting `test` or
`main`. It runs generated-file checks, lint, TypeScript, unit tests, local-D1
integration tests, and an OpenNext Worker build.

Only a push to `main` deploys. The `test` branch is validation-only until a
separate staging D1 database is provisioned, preventing staging code from
writing production data.

Required GitHub production secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Apply D1 migrations and deploy the Worker |
| `CLOUDFLARE_ACCOUNT_ID` | Select the Cloudflare account |

Worker runtime secrets such as `CRON_SECRET` and `FRED_API_KEY` remain in
Cloudflare and are preserved during CI deployments.

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

Then verify the internal route authentication and run scheduled syncs through
the existing scheduler using the `CRON_SECRET` bearer token.
