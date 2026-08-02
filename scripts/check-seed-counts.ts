import { count, sql } from "drizzle-orm";
import { indicatorSources, indicators } from "../lib/db/schema";
import { withRemoteD1 } from "./d1-runtime";

async function main() {
  await withRemoteD1(async (db) => {
    const indicatorRow = await db
      .select({
        table: sql`'indicators'`,
        count: count(),
      })
      .from(indicators);

    const sourceRow = await db
      .select({
        table: sql`'indicator_sources'`,
        count: count(),
      })
      .from(indicatorSources);

    const rows = [...indicatorRow, ...sourceRow];
    for (const row of rows) {
      console.log(`${row.table}: ${row.count}`);
    }
  });
}

main().catch((error) => {
  console.error("[check-seed-counts] failed:", error);
  process.exit(1);
});
