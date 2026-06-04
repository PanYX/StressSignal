# StressSignal Deployment

StressSignal deploys as a Next.js standalone Docker image, following the same
operating pattern as `privconvert`:

1. GitHub Actions verifies the app.
2. GitHub Actions builds and publishes a Docker image to GHCR.
3. The target server pulls the image and runs it with Docker Compose.
4. The deploy script checks container startup before pruning old images.

Do not commit `.env.local`, production database URLs, API keys, or cron secrets.

## GitHub Actions

### `CI`

Runs on pull requests and pushes to `main`/`master`:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:unit
pnpm build
```

Set repository variable `NEXT_PUBLIC_SITE_URL` to the public origin, normally:

```text
https://stresssignal.com
```

### `Docker Publish And Deploy`

Runs on pushes to `main`/`master` and can also be started manually.

When deployment runs, the workflow can run:

```bash
pnpm run db:migrate
pnpm seed:indicators
```

Manual dispatch exposes `run_migrations`; pushes to `main`/`master` run
migrations before deployment.

Required repository secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | SSH host for the Docker server |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_PRIVATE_KEY` | Private key for deployment SSH |
| `DEPLOY_PATH` | Directory on the server for compose files and scripts |
| `GHCR_READ_TOKEN` | Token the server uses to pull private GHCR images |
| `DATABASE_URL` | Production PostgreSQL DSN |
| `CRON_SECRET` | Shared secret for internal sync/recompute/revalidate routes |
| `FRED_API_KEY` | FRED API key, if live sync is enabled |

Optional repository variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://stresssignal.com` | Public canonical origin |
| `HOST_BIND_IP` | `127.0.0.1` | Host IP Docker binds to |
| `HOST_PORT` | `3014` | Host port for production compose |

## Server Runtime

The compose files expect runtime environment variables, not committed env files.
The GitHub deploy workflow passes them over SSH when invoking:

```bash
scripts/run_deployment.sh
```

Manual server deployment uses the same script:

```bash
ENV=production \
NEXT_IMAGE=ghcr.io/<owner>/stresssignal:<sha> \
GH_USER=<github-user> \
GH_PAT=<ghcr-token> \
NEXT_PUBLIC_SITE_URL=https://stresssignal.com \
DATABASE_URL='<postgres-dsn>' \
FRED_API_KEY='<fred-key>' \
CRON_SECRET='<cron-secret>' \
scripts/run_deployment.sh
```

The script pulls the image before stopping the existing container, then runs a
local container health check against `http://localhost:3000`.

## Nginx

The nginx reverse-proxy config lives at:

```text
deploy/nginx/stresssignal.com.conf
```

It expects the app container to bind locally on `127.0.0.1:3014`, matching
`docker-compose.production.yml`. It redirects HTTP and `www` traffic to:

```text
https://stresssignal.com
```

Expected certificate paths:

```text
/etc/nginx/ssl/stresssignal.com/stresssignal.com.pem
/etc/nginx/ssl/stresssignal.com/stresssignal.com.key
```

Example server activation:

```bash
sudo ln -sf "$DEPLOY_PATH/deploy/nginx/stresssignal.com.conf" \
  /etc/nginx/conf.d/stresssignal.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Deploy Checks

After deployment:

```bash
curl -I https://stresssignal.com
curl -sS https://stresssignal.com/robots.txt
curl -sS https://stresssignal.com/sitemap.xml
curl -sS https://stresssignal.com/api/v1/summary
```

Run live data sync separately or through your scheduler:

```bash
curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://stresssignal.com/api/internal/sync/fred"

curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://stresssignal.com/api/internal/compute-snapshots"

curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d '{"tags":["market-risk-dashboard","indicators"]}' \
  "https://stresssignal.com/api/internal/revalidate"
```
