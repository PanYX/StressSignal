import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestampMs = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const indicators = sqliteTable(
  "indicators",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    frequency: text("frequency").notNull(),
    status: text("status").notNull(),
    sourcePolicy: text("source_policy").notNull(),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    uniqueIndex("indicators_slug_uq").on(table.slug),
    index("indicators_frequency_idx").on(table.frequency),
    index("indicators_status_idx").on(table.status),
    index("indicators_category_idx").on(table.category),
  ],
);

export const indicatorSources = sqliteTable(
  "indicator_sources",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    indicatorId: text("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    fetchMode: text("fetch_mode").notNull(),
    sourceUrl: text("source_url").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    licenseNote: text("license_note"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: timestampMs("created_at"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [
    index("indicator_sources_indicator_idx").on(table.indicatorId),
    uniqueIndex("indicator_sources_mapping_uq").on(
      table.indicatorId,
      table.provider,
      table.externalId,
    ),
  ],
);

export const observations = sqliteTable(
  "observations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    indicatorId: text("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    observationDate: text("observation_date").notNull(),
    value: real("value").notNull(),
    rawPayload: text("raw_payload", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    sourceProvider: text("source_provider").notNull(),
    sourceExternalId: text("source_external_id").notNull(),
    fetchedAt: timestampMs("fetched_at"),
  },
  (table) => [
    uniqueIndex("observations_indicator_date_uq").on(
      table.indicatorId,
      table.sourceExternalId,
      table.observationDate,
    ),
    index("observations_indicator_date_idx").on(
      table.indicatorId,
      table.observationDate,
    ),
    index("observations_source_external_idx").on(table.sourceExternalId),
  ],
);

export const indicatorSnapshots = sqliteTable(
  "indicator_snapshots",
  {
    indicatorId: text("indicator_id")
      .primaryKey()
      .references(() => indicators.id, { onDelete: "cascade" }),
    latestValue: real("latest_value"),
    latestDate: text("latest_date"),
    change1d: real("change_1d"),
    change5d: real("change_5d"),
    change20d: real("change_20d"),
    pctRank1y: real("pct_rank_1y"),
    zscore1y: real("zscore_1y"),
    stateLabel: text("state_label"),
    updatedAt: timestampMs("updated_at"),
  },
  (table) => [index("indicator_snapshots_updated_idx").on(table.updatedAt)],
);

export const syncRuns = sqliteTable(
  "sync_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(),
    jobName: text("job_name").notNull(),
    status: text("status").notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    recordsUpserted: integer("records_upserted"),
    errorMessage: text("error_message"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
  },
  (table) => [index("sync_runs_status_started_idx").on(table.status, table.startedAt)],
);

export const dailyCommentaries = sqliteTable(
  "daily_commentaries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    asOfDate: text("as_of_date").notNull(),
    scope: text("scope").notNull(),
    headline: text("headline").notNull(),
    summary: text("summary").notNull(),
    bodyMd: text("body_md").notNull(),
    model: text("model").notNull(),
    inputsJson: text("inputs_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestampMs("created_at"),
  },
  (table) => [
    uniqueIndex("daily_commentaries_asof_scope_uq").on(
      table.asOfDate,
      table.scope,
    ),
    index("daily_commentaries_scope_idx").on(table.scope),
  ],
);

export const indicatorRelations = relations(indicators, ({ many }) => ({
  sources: many(indicatorSources),
  observations: many(observations),
  snapshots: many(indicatorSnapshots),
}));

export const observationRelations = relations(observations, ({ one }) => ({
  indicator: one(indicators, {
    fields: [observations.indicatorId],
    references: [indicators.id],
  }),
}));

export const sourceRelations = relations(indicatorSources, ({ one }) => ({
  indicator: one(indicators, {
    fields: [indicatorSources.indicatorId],
    references: [indicators.id],
  }),
}));

export const snapshotRelations = relations(indicatorSnapshots, ({ one }) => ({
  indicator: one(indicators, {
    fields: [indicatorSnapshots.indicatorId],
    references: [indicators.id],
  }),
}));
