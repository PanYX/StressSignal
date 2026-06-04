import { and, asc, eq, sql } from "drizzle-orm";

import { fetchCboeDailyPricesCsv } from "../lib/adapters/cboe";
import { closeDb, db } from "../lib/db/client";
import {
  indicatorSources,
  indicators,
  observations as observationsTable,
} from "../lib/db/schema";

const PROVIDER = "cboe";
const BATCH_SIZE = 1000;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

async function main() {
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
    });
    const rows = parsed.observations.map((item) => ({
      indicatorId: source.indicatorId,
      observationDate: item.date,
      value: item.value.toString(),
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
            fetchedAt: sql`now()`,
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

main()
  .catch((error) => {
    console.error("[sync-cboe] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDb();
  });
