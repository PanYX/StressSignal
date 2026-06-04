import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

type RuntimeState = {
  appPort: number;
  appPid: number;
  containerName: string;
  databaseUrl: string;
  cronSecret: string;
  statePath: string;
};

type EnvOverrides = Record<string, string | undefined>;

const APP_PORT = Number.parseInt(process.env.E2E_APP_PORT ?? "3101", 10);
const POSTGRES_DB = "stresssignal";
const POSTGRES_USER = "postgres";
const POSTGRES_PASSWORD = "postgres";
const IMAGE = "postgres:16-alpine";
const CRON_SECRET = process.env.E2E_CRON_SECRET ?? "e2e-local-secret";
const STATE_PATH = path.resolve(process.cwd(), "tests/e2e/.e2e-runtime.json");
const MAX_DB_READY_ATTEMPTS = 120;

const run = (command: string, env: EnvOverrides = {}) => {
  return execSync(command, {
    stdio: "pipe",
    env: {
      ...process.env,
      ...env,
    } as NodeJS.ProcessEnv,
  });
};

const pickContainerName = () => {
  const seed = `${Date.now()}`.slice(-8);
  return `stresssignal-t011-e2e-${seed}`;
};

const startPostgres = async (): Promise<{ containerName: string; port: number }> => {
  const containerName = pickContainerName();

  try {
    run(`docker rm -f ${containerName}`);
  } catch {
    // intentional best effort
  }

  run(
    `docker run -d --name ${containerName} ` +
      `-e POSTGRES_USER=${POSTGRES_USER} ` +
      `-e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} ` +
      `-e POSTGRES_DB=${POSTGRES_DB} ` +
      `-p 0:5432 ${IMAGE}`,
  );

  const portOutput = run(`docker port ${containerName} 5432/tcp`).toString().trim();
  const match = portOutput.match(/:(\d+)$/);
  const portText = match?.[1];

  if (!portText) {
    throw new Error(`Unable to read mapped Postgres port for ${containerName}`);
  }

  const dbPort = Number.parseInt(portText, 10);
  if (!Number.isFinite(dbPort)) {
    throw new Error(`Invalid mapped Postgres port for ${containerName}: ${portText}`);
  }

  return { containerName, port: dbPort };
};

const waitForDatabase = async (containerName: string) => {
  for (let attempt = 1; attempt <= MAX_DB_READY_ATTEMPTS; attempt += 1) {
    try {
      run(`docker exec ${containerName} pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`);
      return;
    } catch {
      if (attempt >= MAX_DB_READY_ATTEMPTS) {
        throw new Error(`Postgres not ready after ${MAX_DB_READY_ATTEMPTS} attempts`);
      }

      await sleep(500);
    }
  }
};

const waitForServer = async (url: string) => {
  for (let attempt = 1; attempt <= MAX_DB_READY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        return;
      }
    } catch {
      // keep waiting
    }

    if (attempt >= MAX_DB_READY_ATTEMPTS) {
      throw new Error(`App server not ready after ${MAX_DB_READY_ATTEMPTS} attempts for ${url}`);
    }

    await sleep(500);
  }
};

export default async function globalSetup() {
  const { containerName, port: dbPort } = await startPostgres();
  await waitForDatabase(containerName);

  const databaseUrl = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${dbPort}/${POSTGRES_DB}`;
  const nextPublicSiteUrl = `http://127.0.0.1:${APP_PORT}`;

  run("pnpm run db:migrate", {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
    CRON_SECRET,
    FRED_API_KEY: "e2e-synthetic-key",
  });

  run("pnpm seed:indicators", {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
    CRON_SECRET,
    FRED_API_KEY: "e2e-synthetic-key",
  });

  run("pnpm exec tsx scripts/.tmp-t007-seed-observations.ts", {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
    CRON_SECRET,
    FRED_API_KEY: "e2e-synthetic-key",
  });

  run("pnpm exec tsx scripts/recompute-snapshots.ts --write", {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
    CRON_SECRET,
    FRED_API_KEY: "e2e-synthetic-key",
  });

  run("pnpm exec next build", {
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
    CRON_SECRET,
  });

  const appProcess = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "exec",
      "next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      `${APP_PORT}`,
    ],
    {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NEXT_PUBLIC_SITE_URL: nextPublicSiteUrl,
        CRON_SECRET,
      },
      stdio: "ignore",
      detached: false,
    },
  );

  const baseUrl = `http://127.0.0.1:${APP_PORT}`;
  await waitForServer(`${baseUrl}/`);
  await waitForServer(`${baseUrl}/api/v1/summary`);

  const runtimeState: RuntimeState = {
    appPort: APP_PORT,
    appPid: appProcess.pid ?? -1,
    containerName,
    databaseUrl,
    cronSecret: CRON_SECRET,
    statePath: STATE_PATH,
  };

  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(runtimeState, null, 2), "utf8");

  appProcess.unref();
}
