import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const indicators = pgTable(
  "indicators",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    unit: text("unit").notNull(),
    frequency: text("frequency").notNull(),
    status: text("status").notNull(),
    sourcePolicy: text("source_policy").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("indicators_slug_uq").on(table.slug),
    index("indicators_frequency_idx").on(table.frequency),
    index("indicators_status_idx").on(table.status),
    index("indicators_category_idx").on(table.category),
  ],
);

export const indicatorSources = pgTable(
  "indicator_sources",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    fetchMode: text("fetch_mode").notNull(),
    sourceUrl: text("source_url").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    licenseNote: text("license_note"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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

export const observations = pgTable(
  "observations",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    indicatorId: uuid("indicator_id")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    observationDate: date("observation_date").notNull(),
    value: numeric("value", { precision: 20, scale: 10 }).notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    sourceProvider: text("source_provider").notNull(),
    sourceExternalId: text("source_external_id").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

export const indicatorSnapshots = pgTable(
  "indicator_snapshots",
  {
    indicatorId: uuid("indicator_id")
      .primaryKey()
      .references(() => indicators.id, { onDelete: "cascade" }),
    latestValue: numeric("latest_value", { precision: 20, scale: 10 }),
    latestDate: date("latest_date"),
    change1d: numeric("change_1d", { precision: 20, scale: 10 }),
    change5d: numeric("change_5d", { precision: 20, scale: 10 }),
    change20d: numeric("change_20d", { precision: 20, scale: 10 }),
    pctRank1y: numeric("pct_rank_1y", { precision: 10, scale: 6 }),
    zscore1y: numeric("zscore_1y", { precision: 10, scale: 6 }),
    stateLabel: text("state_label"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("indicator_snapshots_updated_idx").on(table.updatedAt)],
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(),
    jobName: text("job_name").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    recordsUpserted: integer("records_upserted"),
    errorMessage: text("error_message"),
    meta: jsonb("meta"),
  },
  (table) => [index("sync_runs_status_started_idx").on(table.status, table.startedAt)],
);

export const dailyCommentaries = pgTable(
  "daily_commentaries",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    asOfDate: date("as_of_date").notNull(),
    scope: text("scope").notNull(),
    headline: text("headline").notNull(),
    summary: text("summary").notNull(),
    bodyMd: text("body_md").notNull(),
    model: text("model").notNull(),
    inputsJson: jsonb("inputs_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
