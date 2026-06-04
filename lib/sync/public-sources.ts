import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import {
  PublicSourceAdapterError,
  PUBLIC_SOURCE_PROVIDER_FETCH_MODES,
  type PublicSourceObservationsParseResult,
  type PublicSourceSkippedObservation,
  fetchPublicSourceObservations,
} from "../adapters/public-sources";
import { db } from "../db/client";
import {
  indicatorSources,
  indicators,
  observations as observationsTable,
  syncRuns,
} from "../db/schema";
import {
  getSyncStartDate,
  shouldFetchSource,
  type FreshnessDecisionReason,
} from "./freshness";

export const PUBLIC_SOURCES_JOB_NAME = "sync-public-sources";
export const PUBLIC_SOURCES_RUN_PROVIDER = "public_sources";

type SerializedError = {
  code: string;
  message: string;
};

type PublicSourceRow = {
  indicatorId: string;
  indicatorSlug: string;
  indicatorFrequency: string;
  sourceProvider: string;
  sourceExternalId: string;
  sourceFetchMode: string;
  sourceUrl: string;
  sourceIsPrimary: boolean;
};

export type PublicSourceSyncSeriesResult = {
  indicatorSlug: string;
  indicatorId: string;
  indicatorFrequency: string;
  sourceProvider: string;
  sourceExternalId: string;
  sourceFetchMode: string;
  sourceUrl: string;
  sourceIsPrimary: boolean;
  status: "success" | "skipped" | "failed";
  fetchTransport: string | null;
  latestObservationDate: string | null;
  lastFetchedAt: string | null;
  expectedObservationDate: string | null;
  syncStartDate: string | null;
  freshnessReason: FreshnessDecisionReason | null;
  requestedObservations: number;
  upsertedObservations: number;
  skippedObservations: number;
  skippedSamples: Array<{
    raw: Record<string, unknown>;
    reason: PublicSourceSkippedObservation["reason"];
  }>;
  errors: SerializedError[];
};

export type PublicSourcesSyncRunResponse = {
  provider: string;
  jobName: string;
  status: "success" | "partial_failure" | "failed";
  counts: {
    activeSources: number;
    successfulSources: number;
    skippedSources: number;
    failedSources: number;
    observationsFetched: number;
    observationsUpserted: number;
    observationsSkipped: number;
  };
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  series: PublicSourceSyncSeriesResult[];
  changedSlugs: string[];
  summary: {
    hasFailures: boolean;
    failedSources: string[];
  };
};

const SUPPORTED_PROVIDERS = [
  ...new Set(PUBLIC_SOURCE_PROVIDER_FETCH_MODES.map((item) => item.provider)),
];

const getSourceKey = (
  provider: string,
  indicatorId: string,
  sourceExternalId: string,
): string => `${provider}:${indicatorId}:${sourceExternalId}`;

const toDateString = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
};

const toIsoString = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
};

const serializeError = (error: unknown): SerializedError => {
  if (error instanceof PublicSourceAdapterError) {
    return { code: error.code, message: error.message };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  ) {
    const coded = error as { code?: unknown; message?: unknown };
    return {
      code: typeof coded.code === "string" ? coded.code : "unknown_error",
      message: typeof coded.message === "string" ? coded.message : "Unknown error",
    };
  }

  if (error instanceof Error) {
    return { code: "unknown_error", message: error.message };
  }

  return { code: "unknown_error", message: "An unexpected error occurred." };
};

const serializeSkipped = (items: readonly PublicSourceSkippedObservation[]) =>
  items.slice(0, 5).map((item) => ({
    raw: item.raw,
    reason: item.reason,
  }));

const buildResponse = (params: {
  start: Date;
  finish: Date;
  series: PublicSourceSyncSeriesResult[];
  activeSources: number;
  observationsFetched: number;
  observationsUpserted: number;
  observationsSkipped: number;
}): PublicSourcesSyncRunResponse => {
  const successfulSources = params.series.filter((item) => item.status === "success").length;
  const skippedSources = params.series.filter((item) => item.status === "skipped").length;
  const failedSources = params.series.filter((item) => item.status === "failed").length;
  const hasFailures = failedSources > 0;
  const changedSlugs = [
    ...new Set(
      params.series
        .filter((item) => item.upsertedObservations > 0)
        .map((item) => item.indicatorSlug),
    ),
  ];

  return {
    provider: PUBLIC_SOURCES_RUN_PROVIDER,
    jobName: PUBLIC_SOURCES_JOB_NAME,
    status: hasFailures ? "partial_failure" : "success",
    counts: {
      activeSources: params.activeSources,
      successfulSources,
      skippedSources,
      failedSources,
      observationsFetched: params.observationsFetched,
      observationsUpserted: params.observationsUpserted,
      observationsSkipped: params.observationsSkipped,
    },
    startedAt: params.start.toISOString(),
    finishedAt: params.finish.toISOString(),
    durationMs: params.finish.getTime() - params.start.getTime(),
    series: params.series,
    changedSlugs,
    summary: {
      hasFailures,
      failedSources: params.series
        .filter((item) => item.status === "failed")
        .map(
          (item) =>
            `${item.indicatorSlug}(${item.sourceProvider}:${item.sourceExternalId})`,
        ),
    },
  };
};

const createSyncRunRecord = async (startedAt: Date) => {
  const inserted = await db
    .insert(syncRuns)
    .values({
      provider: PUBLIC_SOURCES_RUN_PROVIDER,
      jobName: PUBLIC_SOURCES_JOB_NAME,
      status: "running",
      startedAt,
      meta: {
        provider: PUBLIC_SOURCES_RUN_PROVIDER,
        jobName: PUBLIC_SOURCES_JOB_NAME,
        startedAt: startedAt.toISOString(),
      },
    })
    .returning({ id: syncRuns.id });

  return inserted[0]?.id ?? null;
};

const upsertObservationRows = async (
  payload: PublicSourceObservationsParseResult,
  source: PublicSourceRow,
): Promise<number> => {
  if (payload.observations.length === 0) {
    return 0;
  }

  const rows = payload.observations.map((item) => ({
    indicatorId: source.indicatorId,
    observationDate: item.date,
    value: item.value.toString(),
    rawPayload: item.raw,
    sourceProvider: source.sourceProvider,
    sourceExternalId: source.sourceExternalId,
  }));

  const upserted = await db
    .insert(observationsTable)
    .values(rows)
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

  return upserted.length;
};

const fetchActivePublicSources = async (): Promise<PublicSourceRow[]> => {
  const modePredicates = PUBLIC_SOURCE_PROVIDER_FETCH_MODES.map((item) =>
    and(
      eq(indicatorSources.provider, item.provider),
      eq(indicatorSources.fetchMode, item.fetchMode),
    ),
  );

  const supportedModePredicate = or(...modePredicates);
  if (!supportedModePredicate) {
    return [];
  }

  return db
    .select({
      indicatorId: indicatorSources.indicatorId,
      indicatorSlug: indicators.slug,
      indicatorFrequency: indicators.frequency,
      sourceProvider: indicatorSources.provider,
      sourceExternalId: indicatorSources.externalId,
      sourceFetchMode: indicatorSources.fetchMode,
      sourceUrl: indicatorSources.sourceUrl,
      sourceIsPrimary: indicatorSources.isPrimary,
    })
    .from(indicatorSources)
    .innerJoin(indicators, eq(indicatorSources.indicatorId, indicators.id))
    .where(
      and(
        supportedModePredicate,
        eq(indicatorSources.active, true),
        eq(indicators.status, "active"),
      ),
    )
    .orderBy(
      indicatorSources.provider,
      indicatorSources.indicatorId,
      asc(indicatorSources.isPrimary),
    );
};

export const runPublicSourcesSync = async ({
  now = new Date(),
}: {
  now?: Date;
} = {}): Promise<PublicSourcesSyncRunResponse> => {
  const startedAt = now;
  const runId = await createSyncRunRecord(startedAt);

  if (!runId) {
    throw new Error("failed to create sync run record");
  }

  const sourceResults: PublicSourceSyncSeriesResult[] = [];
  let fetchedCount = 0;
  let upsertedCount = 0;
  let skippedCount = 0;
  let activeSourceCount = 0;
  let response: PublicSourcesSyncRunResponse;
  let runLevelError: SerializedError | null = null;

  try {
    const activeSources = await fetchActivePublicSources();
    activeSourceCount = activeSources.length;

    const latestRows = await db
      .select({
        indicatorId: observationsTable.indicatorId,
        sourceProvider: observationsTable.sourceProvider,
        sourceExternalId: observationsTable.sourceExternalId,
        latestObservationDate: sql<Date | string | null>`max(${observationsTable.observationDate})`,
        lastFetchedAt: sql<Date | string | null>`max(${observationsTable.fetchedAt})`,
      })
      .from(observationsTable)
      .where(inArray(observationsTable.sourceProvider, SUPPORTED_PROVIDERS))
      .groupBy(
        observationsTable.indicatorId,
        observationsTable.sourceProvider,
        observationsTable.sourceExternalId,
      );

    const sourceStateBySource = new Map(
      latestRows.map((row) => [
        getSourceKey(row.sourceProvider, row.indicatorId, row.sourceExternalId),
        {
          latestObservationDate: toDateString(row.latestObservationDate),
          lastFetchedAt: toIsoString(row.lastFetchedAt),
        },
      ]),
    );
    const fetchCache = new Map<string, Promise<PublicSourceObservationsParseResult>>();

    for (const source of activeSources) {
      const sourceState =
        sourceStateBySource.get(
          getSourceKey(source.sourceProvider, source.indicatorId, source.sourceExternalId),
        ) ?? {
          latestObservationDate: null,
          lastFetchedAt: null,
        };
      const { latestObservationDate, lastFetchedAt } = sourceState;
      const syncStartDate = getSyncStartDate(
        latestObservationDate,
        source.indicatorFrequency,
      );
      const summary: PublicSourceSyncSeriesResult = {
        indicatorSlug: source.indicatorSlug,
        indicatorId: source.indicatorId,
        indicatorFrequency: source.indicatorFrequency,
        sourceProvider: source.sourceProvider,
        sourceExternalId: source.sourceExternalId,
        sourceFetchMode: source.sourceFetchMode,
        sourceUrl: source.sourceUrl,
        sourceIsPrimary: source.sourceIsPrimary,
        status: "success",
        fetchTransport: null,
        latestObservationDate,
        lastFetchedAt,
        expectedObservationDate: null,
        syncStartDate,
        freshnessReason: null,
        requestedObservations: 0,
        upsertedObservations: 0,
        skippedObservations: 0,
        skippedSamples: [],
        errors: [],
      };

      try {
        const freshness = shouldFetchSource({
          frequency: source.indicatorFrequency,
          latestObservationDate,
          lastFetchedAt,
          now: startedAt,
        });
        summary.expectedObservationDate = freshness.expectedObservationDate;
        summary.freshnessReason = freshness.reason;

        if (!freshness.shouldFetch) {
          summary.status = "skipped";
          sourceResults.push(summary);
          continue;
        }

        const cacheKey = [
          source.sourceProvider,
          source.sourceFetchMode,
          source.sourceExternalId,
          source.sourceUrl,
          syncStartDate ?? "full",
        ].join("|");
        const parsedPromise =
          fetchCache.get(cacheKey) ??
          fetchPublicSourceObservations({
            provider: source.sourceProvider,
            fetchMode: source.sourceFetchMode,
            externalId: source.sourceExternalId,
            sourceUrl: source.sourceUrl,
            observationStart: syncStartDate,
            now: startedAt,
          });
        fetchCache.set(cacheKey, parsedPromise);

        const parsed = await parsedPromise;
        const skipped = serializeSkipped(parsed.skipped);
        summary.fetchTransport = parsed.transport;
        summary.requestedObservations = parsed.observations.length + parsed.skipped.length;
        summary.skippedObservations = parsed.skipped.length;
        summary.skippedSamples = skipped;
        fetchedCount += summary.requestedObservations;
        skippedCount += summary.skippedObservations;

        const upserted = await upsertObservationRows(parsed, source);
        summary.upsertedObservations = upserted;
        upsertedCount += upserted;
      } catch (error) {
        summary.status = "failed";
        summary.errors.push(serializeError(error));
      }

      sourceResults.push(summary);
    }

    response = buildResponse({
      start: startedAt,
      finish: new Date(),
      series: sourceResults,
      activeSources: activeSourceCount,
      observationsFetched: fetchedCount,
      observationsUpserted: upsertedCount,
      observationsSkipped: skippedCount,
    });
  } catch (error) {
    response = buildResponse({
      start: startedAt,
      finish: new Date(),
      series: sourceResults,
      activeSources: activeSourceCount,
      observationsFetched: fetchedCount,
      observationsUpserted: upsertedCount,
      observationsSkipped: skippedCount,
    });
    response.status = "failed";
    runLevelError = serializeError(error);
    response.summary = {
      hasFailures: true,
      failedSources: [
        ...response.summary.failedSources,
        `run-level:${runLevelError.code}:${runLevelError.message}`,
      ],
    };
  }

  const hasFailures = response.summary.hasFailures;
  const runStatus = runLevelError
    ? "failed"
    : response.summary.failedSources.length > 0
      ? "partial"
      : "success";

  await db
    .update(syncRuns)
    .set({
      status: runStatus,
      finishedAt: new Date(),
      recordsUpserted: upsertedCount,
      errorMessage: hasFailures
        ? `${PUBLIC_SOURCES_JOB_NAME} completed with ${response.summary.failedSources.length} failed source(s)`
        : null,
      meta: {
        provider: PUBLIC_SOURCES_RUN_PROVIDER,
        jobName: PUBLIC_SOURCES_JOB_NAME,
        startedAt: response.startedAt,
        finishedAt: response.finishedAt,
        durationMs: response.durationMs,
        counts: response.counts,
        freshness: response.series.map((item) => ({
          indicatorSlug: item.indicatorSlug,
          sourceProvider: item.sourceProvider,
          sourceExternalId: item.sourceExternalId,
          sourceFetchMode: item.sourceFetchMode,
          indicatorFrequency: item.indicatorFrequency,
          status: item.status,
          fetchTransport: item.fetchTransport,
          latestObservationDate: item.latestObservationDate,
          lastFetchedAt: item.lastFetchedAt,
          expectedObservationDate: item.expectedObservationDate,
          syncStartDate: item.syncStartDate,
          freshnessReason: item.freshnessReason,
        })),
        skipped: response.series
          .filter((item) => item.skippedObservations > 0)
          .map((item) => ({
            indicatorSlug: item.indicatorSlug,
            sourceProvider: item.sourceProvider,
            sourceExternalId: item.sourceExternalId,
            skippedObservations: item.skippedObservations,
            skippedSamples: item.skippedSamples,
          })),
        errors: response.series.flatMap((item) =>
          item.errors.map((error) => ({
            indicatorSlug: item.indicatorSlug,
            sourceProvider: item.sourceProvider,
            sourceExternalId: item.sourceExternalId,
            ...error,
          })),
        ),
        hasFailures,
        sourceCount: response.counts.activeSources,
      },
    })
    .where(eq(syncRuns.id, runId));

  return response;
};
