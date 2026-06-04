import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema";

const loadLocalEnv = () => {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    loadEnvFile(envPath);
  }
};

loadLocalEnv();

export const isDatabaseUrlFromEnvironment =
  Boolean(process.env.DATABASE_URL?.trim());

export const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured in the environment.");
  }

  return databaseUrl;
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

type GlobalWithDbPool = typeof globalThis & {
  stressSignalPgPool?: Pool;
  stressSignalDb?: NodePgDatabase<typeof schema>;
};

const globalWithDbPool = globalThis as GlobalWithDbPool;

const createPool = () => {
  const poolConfig: PoolConfig = {
    connectionString: getDatabaseUrl(),
    max: parsePositiveInteger(process.env.DATABASE_POOL_MAX, 5),
    connectionTimeoutMillis: parsePositiveInteger(
      process.env.DATABASE_CONNECTION_TIMEOUT_MS,
      10_000,
    ),
    idleTimeoutMillis: parsePositiveInteger(
      process.env.DATABASE_IDLE_TIMEOUT_MS,
      30_000,
    ),
  };

  return new Pool(poolConfig);
};

const getPool = (): Pool => {
  if (process.env.NODE_ENV === "development") {
    return (globalWithDbPool.stressSignalPgPool ??= createPool());
  }

  return (globalWithDbPool.stressSignalPgPool ??= createPool());
};

const getDb = (): NodePgDatabase<typeof schema> =>
  (globalWithDbPool.stressSignalDb ??= drizzle(getPool(), { schema }));

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, property) {
    const database = getDb();
    const value = database[property as keyof typeof database];

    return typeof value === "function" ? value.bind(database) : value;
  },
});

export async function closeDb() {
  const pool = globalWithDbPool.stressSignalPgPool;
  if (!pool) {
    return;
  }

  await pool.end();
  if (globalWithDbPool.stressSignalPgPool === pool) {
    globalWithDbPool.stressSignalPgPool = undefined;
  }
  globalWithDbPool.stressSignalDb = undefined;
}

export const pool = new Proxy({} as Pool, {
  get(_target, property) {
    const activePool = getPool();
    const value = activePool[property as keyof Pool];

    return typeof value === "function" ? value.bind(activePool) : value;
  },
});
