# StressSignal Deployment

StressSignal deploys as a Next.js standalone Docker image, following the same
operating pattern as `privconvert`:

1. GitHub Actions verifies the app.
2. GitHub Actions builds and publishes a Docker image to GHCR.
3. If R2 is configured, GitHub Actions uploads `/_next/static` assets to
   Cloudflare R2 and builds the app with an asset prefix.
4. GitHub Actions packages the compose, deployment script, and nginx config.
5. The target server pulls the image and runs it with Docker Compose.
6. The deploy script checks container startup before pruning old images.

Do not commit `.env.local`, production database URLs, API keys, or cron secrets.

## GitHub Actions

### `CI-CD`

Runs on pushes to `test` and `main`, and can also be started manually.

Branch mapping follows `privconvert`:

| Branch | Environment | Server path | App port |
| --- | --- | --- | --- |
| `test` | `staging` | `/opt/stresssignal/staging` | `5014` |
| `main` | `production` | `/opt/stresssignal/production` | `3014` |

Static Next.js chunks use the same R2 pattern as `privconvert` when the R2
secrets are present:

| Branch | Asset prefix | R2 bucket |
| --- | --- | --- |
| `test` | `https://oss-dev.stresssignal.app/fe` | `stresssignal-dev-assets` |
| `main` | `https://oss.stresssignal.app/fe` | `stresssignal-assets` |

The build job runs:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:unit
```

Then it builds and pushes the Docker image to GHCR.

Before deployment, the target deploy job runs:

```bash
pnpm run db:migrate
pnpm seed:indicators
```

The workflow packages:

```text
docker-compose.yml
docker-compose.staging.yml
docker-compose.production.yml
scripts/run_deployment.sh
deploy/nginx/stresssignal.app.conf
```

Required repository secrets:

| Secret | Purpose |
| --- | --- |
| `STAGING_KEY` | Private SSH key for staging deploy |
| `PROD_KEY` | Private SSH key for production deploy |
| `GH_PAT` | Token the server uses to pull private GHCR images |
| `DATABASE_URL` | PostgreSQL DSN used by migrations and runtime |
| `CRON_SECRET` | Shared secret for internal sync/recompute/revalidate routes |
| `FRED_API_KEY` | FRED API key, if live sync is enabled |
| `GOOGLE_ADSENSE_PUBLISHER_ID` | Optional AdSense publisher ID for `/ads.txt` |
| `R2_ENDPOINT_URL` | Cloudflare R2 account-level S3 endpoint, for example `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | R2 S3 access key used to upload Next static assets |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret key used to upload Next static assets |

Deployment constants are defined in `.github/workflows/ci-cd.yml`, matching
the `privconvert` style: server host, SSH user, SSH port, deploy paths, public
site URLs, asset prefixes, R2 buckets, and host ports. If all three R2 secrets
are absent, the workflow disables R2 and serves static chunks from the app. If
only some R2 secrets are present, the workflow fails instead of deploying a
partially configured build.

## Server Runtime

The compose files expect runtime environment variables, not committed env files.
The GitHub deploy workflow passes them over SSH when invoking:

```bash
./run_deployment.sh
```

Manual server deployment uses the same script:

```bash
ENV=production \
NEXT_IMAGE=ghcr.io/<owner>/stresssignal:<sha> \
GH_USER=<github-user> \
GH_PAT=<ghcr-token> \
NEXT_PUBLIC_SITE_URL=https://stresssignal.app \
DATABASE_URL='<postgres-dsn>' \
FRED_API_KEY='<fred-key>' \
CRON_SECRET='<cron-secret>' \
GOOGLE_ADSENSE_PUBLISHER_ID='<pub-id>' \
HOST_BIND_IP=127.0.0.1 \
HOST_PORT=3014 \
./run_deployment.sh
```

The script pulls the image before stopping the existing container, then runs a
local container health check against `http://localhost:3000`.

## R2 Static Assets

The Docker build receives `NEXT_PUBLIC_ASSET_PREFIX`, so rendered pages reference
Next static chunks under:

```text
https://oss.stresssignal.app/fe/_next/static/...
```

After building and pushing the image, GitHub Actions creates a temporary
container, copies `/app/.next/static` into `.r2-next-static`, deletes source-map
files, and runs:

```bash
bash scripts/upload_r2_next_static.sh
```

The upload script derives the R2 object prefix from the asset prefix and syncs
files to:

```text
s3://stresssignal-assets/fe/_next/static
```

with immutable cache headers.

## Nginx

The nginx reverse-proxy config lives at:

```text
deploy/nginx/stresssignal.app.conf
```

It expects the app container to bind locally on `127.0.0.1:3014`, matching
`docker-compose.production.yml`. It redirects HTTP and `www` traffic to:

```text
https://stresssignal.app
```

Expected certificate paths:

```text
/etc/nginx/ssl/stresssignal.app/stresssignal.app.pem
/etc/nginx/ssl/stresssignal.app/stresssignal.app.key
```

Example server activation:

```bash
sudo ln -sf "$DEPLOY_PATH/deploy/nginx/stresssignal.app.conf" \
  /etc/nginx/conf.d/stresssignal.app.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Deploy Checks

After deployment:

```bash
curl -I https://stresssignal.app
curl -sS https://stresssignal.app/robots.txt
curl -sS https://stresssignal.app/sitemap.xml
curl -sS https://stresssignal.app/api/v1/summary
curl -sS https://stresssignal.app | grep 'oss.stresssignal.app/fe/_next/static'
```

Run live data sync separately or through your scheduler:

```bash
curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://stresssignal.app/api/internal/sync/fred"

curl -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://stresssignal.app/api/internal/compute-snapshots"

curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -d '{"tags":["market-risk-dashboard","indicators"]}' \
  "https://stresssignal.app/api/internal/revalidate"
```
