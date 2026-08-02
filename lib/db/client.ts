import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cache } from "react";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export type AppDatabase = DrizzleD1Database<typeof schema>;

export const createDb = (binding: D1Database): AppDatabase =>
  drizzle(binding, { schema });

/**
 * Resolve the request-scoped D1 binding. The async Cloudflare context also
 * works while OpenNext renders SSG/ISR routes during a build.
 */
export const getDb = cache(async (): Promise<AppDatabase> => {
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
});

export const resolveDb = async (
  database?: AppDatabase,
): Promise<AppDatabase> => database ?? getDb();
