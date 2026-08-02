import { getPlatformProxy } from "wrangler";

import { createDb, type AppDatabase } from "../lib/db/client";

export async function withD1<T>(
  task: (db: AppDatabase) => Promise<T>,
  { remote = true }: { remote?: boolean } = {},
): Promise<T> {
  const platform = await getPlatformProxy<CloudflareEnv>({
    configPath: "wrangler.jsonc",
    envFiles: [],
    persist: true,
    remoteBindings: remote,
  });

  try {
    return await task(createDb(platform.env.DB));
  } finally {
    await platform.dispose();
  }
}

export const withRemoteD1 = <T>(task: (db: AppDatabase) => Promise<T>) =>
  withD1(task, { remote: true });

export const withLocalD1 = <T>(task: (db: AppDatabase) => Promise<T>) =>
  withD1(task, { remote: false });
