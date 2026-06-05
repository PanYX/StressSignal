# StressSignal Deployment

StressSignal deploys as a Next.js standalone Docker image, following the same
operating pattern as `privconvert`:

1. GitHub Actions verifies the app.
2. GitHub Actions builds and publishes a Docker image to GHCR.
3. GitHub Actions packages the compose, deployment script, and nginx config.
4. The target server pulls the image and runs it with Docker Compose.
5. The deploy script checks container startup before pruning old images.

Do not commit `.env.local`, production database URLs, API keys, or cron secrets.

## GitHub Actions

### `CI-CD`

Runs on pushes to `test` and `main`, and can also be started manually.

Branch mapping follows `privconvert`:

| Branch | Environment | Server path | App port |
| --- | --- | --- | --- |
| `test` | `staging` | `/opt/stresssignal/staging` | `5014` |
| `main` | `production` | `/opt/stresssignal/production` | `3014` |

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

Deployment constants are defined in `.github/workflows/ci-cd.yml`, matching
the `privconvert` style: server host, SSH user, SSH port, deploy paths, public
site URLs, and host ports.

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
