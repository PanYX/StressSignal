import { and, asc, eq, sql } from "drizzle-orm";

import {
  FredAdapterError,
  type FredFetchTransport,
  type FredObservationsParseResult,
  type SkippedObservation,
  fetchFredSeriesObservations,
} from "../adapters/fred";
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

export const FRED_PROVIDER = "fred" as const;
export const FRED_JOB_NAME = "sync-fred";

type SyncSourceRow = {
  indicatorId: string;
  indicatorSlug: string;
  indicatorFrequency: string;
  sourceExternalId: string;
  sourceIsPrimary: boolean;
};

type SerializedError = {
  code: string;
  message: string;
};

export type FredSyncSeriesResult = {
  indicatorSlug: string;
  indicatorId: string;
  indicatorFrequency: string;
  sourceExternalId: string;
  sourceIsPrimary: boolean;
  status: "success" | "skipped" | "failed";
  fetchTransport: FredFetchTransport | null;
  latestObservationDate: string | null;
  lastFetchedAt: string | null;
  expectedObservationDate: string | null;
  syncStartDate: string | null;
  freshnessReason: FreshnessDecisionReason | null;
  requestedObservations: number;
  upsertedObservations: number;
  skippedObservations: number;
  skippedSamples: Array<{
    date: string;
    value: string;
    reason: SkippedObservation["reason"];
  }>;
  errors: SerializedError[];
};

export type FredSyncRunResponse = {
  provider: typeof FRED_PROVIDER;
  jobName: typeof FRED_JOB_NAME;
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
  series: FredSyncSeriesResult[];
  changedSlugs: string[];
  summary: {
    hasFailures: boolean;
    failedSources: string[];
  };
};

export const parseFredTransportPreference = (
  value: string | undefined,
): FredFetchTransport | "auto" => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "api_json" || normalized === "graph_csv") {
    return normalized;
  }

  return "auto";
};

const serializeSkipped = (items: readonly SkippedObservation[]) =>
  items.map((entry) => ({
    date: entry.raw.date,
    value: entry.raw.value,
    reason: entry.reason,
  }));

const serializeError = (error: unknown): SerializedError => {
  if (error instanceof FredAdapterError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: "unknown_error", message: error.message };
  }

  return { code: "unknown_error", message: "An unexpected error occurred." };
};

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

const getSourceKey = (indicatorId: string, sourceExternalId: string): string =>
  `${indicatorId}:${sourceExternalId}`;

const getFetchCacheKey = (
  sourceExternalId: string,
  syncStartDate: string | null,
  transport: FredFetchTransport | "auto",
  apiKey: string | undefined,
): string =>
  [sourceExternalId, syncStartDate ?? "full", transport, apiKey ? "api_key" : "public"].join("|");

const buildResponse = (params: {
  start: Date;
  finish: Date;
  series: FredSyncSeriesResult[];
  activeSources: number;
  observationsFetched: number;
  observationsUpserted: number;
  observationsSkipped: number;
}): FredSyncRunResponse => {
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
    provider: FRED_PROVIDER,
    jobName: FRED_JOB_NAME,
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
        .map((item) => `${item.indicatorSlug}(${item.sourceExternalId})`),
    },
  };
};

const createSyncRunRecord = async (startedAt: Date) => {
  const inserted = await db
    .insert(syncRuns)
    .values({
      provider: FRED_PROVIDER,
      jobName: FRED_JOB_NAME,
      status: "running",
      startedAt,
      meta: {
        provider: FRED_PROVIDER,
        jobName: FRED_JOB_NAME,
        startedAt: startedAt.toISOString(),
      },
    })
    .returning({ id: syncRuns.id });

  return inserted.at(0)?.id ?? null;
};

const upsertObservationRows = async (
  payload: FredObservationsParseResult,
  indicatorId: string,
  sourceExternalId: string,
): Promise<number> => {
  if (payload.observations.length === 0) {
    return 0;
  }

  const rows = payload.observations.map((item) => ({
    indicatorId,
    observationDate: item.date,
    value: item.value.toString(),
    rawPayload: item.raw,
    sourceProvider: FRED_PROVIDER,
    sourceExternalId,
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

const fetchActiveFredSources = async (): Promise<SyncSourceRow[]> =>
  db
    .select({
      indicatorId: indicatorSources.indicatorId,
      indicatorSlug: indicators.slug,
      indicatorFrequency: indicators.frequency,
      sourceExternalId: indicatorSources.externalId,
      sourceIsPrimary: indicatorSources.isPrimary,
    })
    .from(indicatorSources)
    .innerJoin(indicators, eq(indicatorSources.indicatorId, indicators.id))
    .where(
      and(
        eq(indicatorSources.provider, FRED_PROVIDER),
        eq(indicatorSources.active, true),
        eq(indicators.status, "active"),
      ),
    )
    .orderBy(indicatorSources.indicatorId, asc(indicatorSources.isPrimary));

export const runFredSync = async ({
  now = new Date(),
  apiKey = process.env.FRED_API_KEY?.trim(),
  transport = parseFredTransportPreference(process.env.FRED_FETCH_TRANSPORT),
}: {
  now?: Date;
  apiKey?: string;
  transport?: FredFetchTransport | "auto";
} = {}): Promise<FredSyncRunResponse> => {
  const startedAt = now;
  const runId = await createSyncRunRecord(startedAt);

  if (!runId) {
    throw new Error("failed to create sync run record");
  }

  const sourceResults: FredSyncSeriesResult[] = [];
  let fetchedCount = 0;
  let upsertedCount = 0;
  let skippedCount = 0;
  let activeSourceCount = 0;
  let response: FredSyncRunResponse;
  let runLevelError: SerializedError | null = null;

  try {
    const activeSources = await fetchActiveFredSources();
    activeSourceCount = activeSources.length;

    const latestRows = await db
      .select({
        indicatorId: observationsTable.indicatorId,
        sourceExternalId: observationsTable.sourceExternalId,
        latestObservationDate: sql<Date | string | null>`max(${observationsTable.observationDate})`,
        lastFetchedAt: sql<Date | string | null>`max(${observationsTable.fetchedAt})`,
      })
      .from(observationsTable)
      .where(eq(observationsTable.sourceProvider, FRED_PROVIDER))
      .groupBy(
        observationsTable.indicatorId,
        observationsTable.sourceExternalId,
      );

    const sourceStateBySource = new Map(
      latestRows.map((row) => [
        getSourceKey(row.indicatorId, row.sourceExternalId),
        {
          latestObservationDate: toDateString(row.latestObservationDate),
          lastFetchedAt: toIsoString(row.lastFetchedAt),
        },
      ]),
    );
    const fetchCache = new Map<string, Promise<FredObservationsParseResult>>();

    for (const source of activeSources) {
      const sourceState =
        sourceStateBySource.get(
          getSourceKey(source.indicatorId, source.sourceExternalId),
        ) ?? {
          latestObservationDate: null,
          lastFetchedAt: null,
        };
      const { latestObservationDate, lastFetchedAt } = sourceState;
      const syncStartDate = getSyncStartDate(
        latestObservationDate,
        source.indicatorFrequency,
      );
      const summary: FredSyncSeriesResult = {
        indicatorSlug: source.indicatorSlug,
        indicatorId: source.indicatorId,
        indicatorFrequency: source.indicatorFrequency,
        sourceExternalId: source.sourceExternalId,
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

        const cacheKey = getFetchCacheKey(
          source.sourceExternalId,
          syncStartDate,
          transport,
          apiKey,
        );
        const cachedParsed = fetchCache.get(cacheKey);

        if (!freshness.shouldFetch) {
          if (!cachedParsed) {
            summary.status = "skipped";
            sourceResults.push(summary);
            continue;
          }
        }

        const parsedPromise =
          cachedParsed ??
          fetchFredSeriesObservations({
            seriesId: source.sourceExternalId,
            apiKey,
            observationStart: syncStartDate,
            transport,
          });
        fetchCache.set(cacheKey, parsedPromise);

        const parsed = await parsedPromise;
        const skipped = serializeSkipped(parsed.skipped);
        summary.fetchTransport = parsed.transport;
        summary.requestedObservations = parsed.observations.length + skipped.length;
        summary.skippedObservations = skipped.length;
        summary.skippedSamples = skipped;
        fetchedCount += summary.requestedObservations;
        skippedCount += summary.skippedObservations;

        const upserted = await upsertObservationRows(
          parsed,
          source.indicatorId,
          source.sourceExternalId,
        );
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
  const partialFailure = hasFailures && !runLevelError && response.summary.failedSources.length > 0;
  const allFailed = hasFailures && response.summary.failedSources.length === response.series.length;
  const runStatus = allFailed || runLevelError ? "failed" : partialFailure ? "partial" : "success";
  const skippedMetadata = response.series
    .filter((item) => item.skippedObservations > 0)
    .map((item) => ({
      sourceExternalId: item.sourceExternalId,
      skippedObservations: item.skippedObservations,
      skippedSamples: item.skippedSamples,
    }));
  const freshnessMetadata = response.series.map((item) => ({
    indicatorSlug: item.indicatorSlug,
    sourceExternalId: item.sourceExternalId,
    indicatorFrequency: item.indicatorFrequency,
    status: item.status,
    fetchTransport: item.fetchTransport,
    latestObservationDate: item.latestObservationDate,
    lastFetchedAt: item.lastFetchedAt,
    expectedObservationDate: item.expectedObservationDate,
    syncStartDate: item.syncStartDate,
    freshnessReason: item.freshnessReason,
  }));
  const errorMetadata = response.series.flatMap((item) =>
    item.errors.map((error) => ({
      sourceExternalId: item.sourceExternalId,
      ...error,
    })),
  );
  if (runLevelError) {
    errorMetadata.push({
      sourceExternalId: "run-level",
      ...runLevelError,
    });
  }

  await db
    .update(syncRuns)
    .set({
      status: runStatus,
      finishedAt: new Date(),
      recordsUpserted: upsertedCount,
      errorMessage: hasFailures
        ? `${FRED_JOB_NAME} completed with ${response.summary.failedSources.length} failed source(s)`
        : null,
      meta: {
        provider: FRED_PROVIDER,
        jobName: FRED_JOB_NAME,
        startedAt: response.startedAt,
        finishedAt: response.finishedAt,
        durationMs: response.durationMs,
        counts: response.counts,
        skipped: skippedMetadata,
        freshness: freshnessMetadata,
        errors: errorMetadata,
        hasFailures,
        sourceCount: response.counts.activeSources,
      },
    })
    .where(eq(syncRuns.id, runId));

  return response;
};
