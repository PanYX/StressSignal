import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { getPlatformProxy, unstable_splitSqlQuery } from "wrangler";

import { recomputeIndicatorSnapshots } from "../../lib/api/compute-snapshots";
import { createDb } from "../../lib/db/client";
import { seedIndicatorMetadata } from "../../lib/db/seed";
import { runFredSync } from "../../lib/sync/fred";
import validObservations from "../fixtures/fred/valid-observations.json";

type RuntimeState = {
  appPort: number;
  appPid: number;
  processGroup: boolean;
  d1StatePath: string;
};

type EnvOverrides = Record<string, string | undefined>;

const APP_PORT = Number.parseInt(process.env.E2E_APP_PORT ?? "43101", 10);
const CRON_SECRET = process.env.E2E_CRON_SECRET ?? "e2e-local-secret";
const STATE_PATH = path.resolve(process.cwd(), "tests/e2e/.e2e-runtime.json");
const D1_STATE_PATH = path.resolve(process.cwd(), "tests/e2e/.wrangler-state");
const D1_PERSIST_PATH = path.join(D1_STATE_PATH, "v3");
const WRANGLER_CONFIG = "wrangler.e2e.jsonc";
const MAX_SERVER_READY_ATTEMPTS = 120;
const PNPM_COMMAND = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const runtimeEnv = (siteUrl: string): NodeJS.ProcessEnv =>
  ({
    ...process.env,
    NEXTJS_ENV: "test",
    NEXT_PUBLIC_SITE_URL: siteUrl,
    CRON_SECRET,
    FRED_API_KEY: "e2e-synthetic-key",
    STRESSSIGNAL_WRANGLER_CONFIG: WRANGLER_CONFIG,
    STRESSSIGNAL_D1_PERSIST_PATH: D1_PERSIST_PATH,
    STRESSSIGNAL_D1_REMOTE: "false",
    CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
  }) as NodeJS.ProcessEnv;

const runPnpm = (args: string[], env: EnvOverrides = {}) => {
  execFileSync(PNPM_COMMAND, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    } as NodeJS.ProcessEnv,
  });
};

const seedLocalD1 = async () => {
  const platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: WRANGLER_CONFIG,
    envFiles: [],
    persist: { path: D1_PERSIST_PATH },
    remoteBindings: false,
  });

  try {
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), "drizzle/d1/0000_special_amphibian.sql"),
      "utf8",
    );
    const statements = unstable_splitSqlQuery(migration).filter(
      (statement) => statement.trim().length > 0,
    );
    await platform.env.DB.batch(
      statements.map((statement) => platform.env.DB.prepare(statement)),
    );

    const database = createDb(platform.env.DB);
    await seedIndicatorMetadata(database);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify(validObservations), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    try {
      await runFredSync({
        now: new Date("2026-01-05T12:00:00.000Z"),
        apiKey: "e2e-synthetic-key",
        transport: "api_json",
        database,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    await recomputeIndicatorSnapshots({ persist: true, database });
  } finally {
    await platform.dispose();
  }
};

const waitForServer = async (url: string, appProcess: ChildProcess) => {
  for (let attempt = 1; attempt <= MAX_SERVER_READY_ATTEMPTS; attempt += 1) {
    if (appProcess.exitCode !== null) {
      throw new Error(
        `Wrangler exited with code ${appProcess.exitCode} before ${url} was ready.`,
      );
    }

    try {
      const response = await fetch(url);
      if (response.status === 200) {
        return;
      }
    } catch {
      // Keep waiting while Wrangler starts the local Worker.
    }

    if (attempt >= MAX_SERVER_READY_ATTEMPTS) {
      throw new Error(
        `App server not ready after ${MAX_SERVER_READY_ATTEMPTS} attempts for ${url}`,
      );
    }

    await sleep(500);
  }
};

const terminate = (appProcess: ChildProcess, processGroup: boolean) => {
  const pid = appProcess.pid;
  if (!pid) {
    return;
  }

  try {
    process.kill(processGroup ? -pid : pid, "SIGTERM");
  } catch {
    // Best effort if Wrangler already exited.
  }
};

export default async function globalSetup() {
  fs.rmSync(D1_STATE_PATH, { recursive: true, force: true });
  fs.rmSync(STATE_PATH, { force: true });

  const baseUrl = `http://127.0.0.1:${APP_PORT}`;
  const env = runtimeEnv(baseUrl);

  runPnpm(
    ["exec", "opennextjs-cloudflare", "build", "--config", WRANGLER_CONFIG],
    env,
  );
  await seedLocalD1();

  const processGroup = process.platform !== "win32";
  const appProcess = spawn(
    PNPM_COMMAND,
    [
      "exec",
      "wrangler",
      "dev",
      "--config",
      WRANGLER_CONFIG,
      "--ip",
      "127.0.0.1",
      "--port",
      `${APP_PORT}`,
      "--persist-to",
      D1_STATE_PATH,
      "--var",
      `NEXT_PUBLIC_SITE_URL:${baseUrl}`,
    ],
    {
      env,
      stdio: "inherit",
      detached: processGroup,
    },
  );

  try {
    await waitForServer(`${baseUrl}/`, appProcess);
    await waitForServer(`${baseUrl}/api/v1/summary`, appProcess);
  } catch (error) {
    terminate(appProcess, processGroup);
    throw error;
  }

  const runtimeState: RuntimeState = {
    appPort: APP_PORT,
    appPid: appProcess.pid ?? -1,
    processGroup,
    d1StatePath: D1_STATE_PATH,
  };

  fs.writeFileSync(STATE_PATH, JSON.stringify(runtimeState, null, 2), "utf8");
  appProcess.unref();
}
