import { and, asc, eq, sql } from "drizzle-orm";

import { fetchCboeDailyPricesCsv } from "../lib/adapters/cboe";
import type { AppDatabase } from "../lib/db/client";
import {
  indicatorSources,
  indicators,
  observations as observationsTable,
} from "../lib/db/schema";
import { withRemoteD1 } from "./d1-runtime";

const PROVIDER = "cboe";
const BATCH_SIZE = 12;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

async function syncCboe(db: AppDatabase, observationStart?: string) {
  const activeSources = await db
    .select({
      indicatorId: indicatorSources.indicatorId,
      indicatorSlug: indicators.slug,
      sourceExternalId: indicatorSources.externalId,
      sourceUrl: indicatorSources.sourceUrl,
    })
    .from(indicatorSources)
    .innerJoin(indicators, eq(indicatorSources.indicatorId, indicators.id))
    .where(
      and(
        eq(indicatorSources.provider, PROVIDER),
        eq(indicatorSources.fetchMode, "csv"),
        eq(indicatorSources.active, true),
        eq(indicators.status, "active"),
      ),
    )
    .orderBy(indicatorSources.indicatorId, asc(indicatorSources.isPrimary));

  const results: Array<{
    indicatorSlug: string;
    sourceExternalId: string;
    fetched: number;
    skipped: number;
    upserted: number;
  }> = [];

  for (const source of activeSources) {
    const parsed = await fetchCboeDailyPricesCsv({
      externalId: source.sourceExternalId,
      sourceUrl: source.sourceUrl,
      observationStart,
    });
    const rows = parsed.observations.map((item) => ({
      indicatorId: source.indicatorId,
      observationDate: item.date,
      value: item.value,
      rawPayload: item.raw,
      sourceProvider: PROVIDER,
      sourceExternalId: source.sourceExternalId,
    }));

    let upserted = 0;
    for (const batch of chunk(rows, BATCH_SIZE)) {
      const written = await db
        .insert(observationsTable)
        .values(batch)
        .onConflictDoUpdate({
          target: [
            observationsTable.indicatorId,
            observationsTable.sourceExternalId,
            observationsTable.observationDate,
          ],
          set: {
            value: sql`excluded.value`,
            rawPayload: sql`excluded.raw_payload`,
            sourceProvider: sql`excluded.source_provider`,
            sourceExternalId: sql`excluded.source_external_id`,
            fetchedAt: sql`(unixepoch() * 1000)`,
          },
        })
        .returning({ id: observationsTable.id });

      upserted += written.length;
    }

    results.push({
      indicatorSlug: source.indicatorSlug,
      sourceExternalId: source.sourceExternalId,
      fetched: parsed.observations.length + parsed.skipped.length,
      skipped: parsed.skipped.length,
      upserted,
    });
  }

  console.log(
    JSON.stringify(
      {
        provider: PROVIDER,
        activeSources: activeSources.length,
        totalUpserted: results.reduce((sum, item) => sum + item.upserted, 0),
        results,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const sinceIndex = process.argv.indexOf("--since");
  const observationStart = sinceIndex >= 0 ? process.argv[sinceIndex + 1] : undefined;
  if (
    sinceIndex >= 0 &&
    (!observationStart || !/^\d{4}-\d{2}-\d{2}$/u.test(observationStart))
  ) {
    throw new Error("--since must be followed by a YYYY-MM-DD date");
  }

  await withRemoteD1((db) => syncCboe(db, observationStart));
}

main().catch((error) => {
  console.error("[sync-cboe] failed:", error);
  process.exitCode = 1;
});
