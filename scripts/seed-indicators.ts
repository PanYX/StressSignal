import { db, closeDb } from "../lib/db/client";
import { indicatorSources, indicators } from "../lib/db/schema";
import { inArray, sql } from "drizzle-orm";
import { MVP_INDICATOR_CONFIGS } from "../lib/indicators/configs";

const indicatorEntries = MVP_INDICATOR_CONFIGS.map((config) => ({
  slug: config.slug,
  name: config.name,
  category: config.category,
  description: config.description,
  unit: config.unit,
  frequency: config.frequency,
  status: config.status,
  sourcePolicy: config.sourcePolicy,
}));

const sourceEntries = MVP_INDICATOR_CONFIGS.flatMap((indicator) =>
  indicator.sources.map((source) => ({
    indicatorSlug: indicator.slug,
    provider: source.provider,
    externalId: source.externalId,
    fetchMode: source.fetchMode,
    sourceUrl: source.sourceUrl,
    isPrimary: source.isPrimary,
    licenseNote: source.licenseNote,
    active: source.active,
  })),
);

async function seedIndicators() {
  const now = new Date();

  const upsertedIndicators = await db
    .insert(indicators)
    .values(
      indicatorEntries.map((item) => ({
        slug: item.slug,
        name: item.name,
        category: item.category,
        description: item.description,
        unit: item.unit,
        frequency: item.frequency,
        status: item.status,
        sourcePolicy: item.sourcePolicy,
      })),
    )
    .onConflictDoUpdate({
      target: indicators.slug,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        description: sql`excluded.description`,
        unit: sql`excluded.unit`,
        frequency: sql`excluded.frequency`,
        status: sql`excluded.status`,
        sourcePolicy: sql`excluded.source_policy`,
        updatedAt: now,
      },
    })
    .returning({ id: indicators.id, slug: indicators.slug });

  const indicatorIdsBySlug = new Map(
    upsertedIndicators.map((row) => [row.slug, row.id]),
  );
  const configuredIndicatorIds = [...indicatorIdsBySlug.values()];

  if (configuredIndicatorIds.length > 0) {
    await db
      .update(indicatorSources)
      .set({
        active: false,
        updatedAt: now,
      })
      .where(inArray(indicatorSources.indicatorId, configuredIndicatorIds));
  }

  for (const source of sourceEntries) {
    const indicatorId = indicatorIdsBySlug.get(source.indicatorSlug);
    if (!indicatorId) {
      throw new Error(
        `Indicator slug not found for source seed: ${source.indicatorSlug}`,
      );
    }

    await db
      .insert(indicatorSources)
      .values({
        indicatorId,
        provider: source.provider,
        externalId: source.externalId,
        fetchMode: source.fetchMode,
        sourceUrl: source.sourceUrl,
        isPrimary: source.isPrimary,
        licenseNote: source.licenseNote,
        active: source.active,
      })
      .onConflictDoUpdate({
        target: [
          indicatorSources.indicatorId,
          indicatorSources.provider,
          indicatorSources.externalId,
        ],
        set: {
          fetchMode: sql`excluded.fetch_mode`,
          sourceUrl: sql`excluded.source_url`,
          isPrimary: sql`excluded.is_primary`,
          licenseNote: sql`excluded.license_note`,
          active: sql`excluded.active`,
          updatedAt: now,
        },
      });
  }

  console.log(
    `Seeded ${upsertedIndicators.length} indicators and ${sourceEntries.length} source mappings.`,
  );
}

async function main() {
  await seedIndicators();
  await closeDb();
}

main().catch((error) => {
  void closeDb().catch(() => {});
  console.error("[seed-indicators] failed:", error);
  process.exit(1);
});
