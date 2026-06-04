import { count, sql } from "drizzle-orm";
import { closeDb, db } from "../lib/db/client";
import { indicatorSources, indicators } from "../lib/db/schema";

async function main() {
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

  await closeDb();
}

main().catch((error) => {
  console.error("[check-seed-counts] failed:", error);
  process.exit(1);
});
