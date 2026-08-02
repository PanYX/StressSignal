import { asc, and, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  CboeAdapterError,
  type CboeObservationsParseResult,
  type CboeSkippedObservation,
  fetchCboeDailyPricesCsv,
} from "../../../../../lib/adapters/cboe";
import {
  hasValidCronToken,
  unauthorizedResponse,
} from "../../../../../lib/api/route";
import { DATA_CACHE_TAGS } from "../../../../../lib/db/cached-queries";
import { getDb } from "../../../../../lib/db/client";
import {
  indicatorSources,
  indicators,
  observations as observationsTable,
  syncRuns,
} from "../../../../../lib/db/schema";
import {
  getSyncStartDate,
  shouldFetchSource,
  type FreshnessDecisionReason,
} from "../../../../../lib/sync/freshness";

const PROVIDER = "cboe" as const;
const JOB_NAME = "sync-cboe";
const D1_OBSERVATION_WRITE_CHUNK_SIZE = 12;
const INITIAL_BACKFILL_YEARS = 5;

const getInitialBackfillStartDate = (now: Date): string => {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  start.setUTCFullYear(start.getUTCFullYear() - INITIAL_BACKFILL_YEARS);
  return start.toISOString().slice(0, 10);
};

type SerializedError = {
  code: string;
  message: string;
};

type SyncSeriesResult = {
  indicatorSlug: string;
  indicatorId: string;
  indicatorFrequency: string;
  sourceExternalId: string;
  sourceUrl: string;
  status: "success" | "skipped" | "failed";
  latestObservationDate: string | null;
  lastFetchedAt: string | null;
  expectedObservationDate: string | null;
  syncStartDate: string | null;
  freshnessReason: FreshnessDecisionReason | null;
  requestedObservations: number;
  upsertedObservations: number;
  skippedObservations: number;
  skippedSamples: Array<{
    raw: Record<string, string>;
    reason: CboeSkippedObservation["reason"];
  }>;
  errors: SerializedError[];
};

type SyncRunResponse = {
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
  series: SyncSeriesResult[];
  summary: {
    hasFailures: boolean;
    failedSources: string[];
  };
};

const toDateString = (value: Date | string | null): string | null => {
  if (value === null) {
    return null;
  }

  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
};

const toIsoString = (value: Date | string | number | null): string | null => {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "number" ? new Date(value).toISOString() : value;
};

const serializeError = (error: unknown): SerializedError => {
  if (error instanceof CboeAdapterError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: "unknown_error", message: error.message };
  }

  return { code: "unknown_error", message: "An unexpected error occurred." };
};

const serializeSkipped = (items: readonly CboeSkippedObservation[]) =>
  items.slice(0, 5).map((item) => ({
    raw: item.raw,
    reason: item.reason,
  }));

const getSourceKey = (indicatorId: string, sourceExternalId: string): string =>
  `${indicatorId}:${sourceExternalId}`;

const safeRevalidateTag = (tag: string) => {
  try {
    revalidateTag(tag, "default");
  } catch {
    // Cache invalidation is best-effort in direct test/runtime invocations.
  }
};

const revalidateObservationCaches = (series: readonly SyncSeriesResult[]) => {
  safeRevalidateTag(DATA_CACHE_TAGS.observations);
  safeRevalidateTag(DATA_CACHE_TAGS.summary);

  const changedSlugs = new Set(
    series
      .filter((item) => item.upsertedObservations > 0)
      .map((item) => item.indicatorSlug),
  );
  changedSlugs.forEach((slug) => safeRevalidateTag(`indicator:${slug}`));
};

const upsertObservationRows = async (
  payload: CboeObservationsParseResult,
  indicatorId: string,
  sourceExternalId: string,
): Promise<number> => {
  if (payload.observations.length === 0) {
    return 0;
  }

  const rows = payload.observations.map((item) => ({
    indicatorId,
    observationDate: item.date,
    value: item.value,
    rawPayload: item.raw,
    sourceProvider: PROVIDER,
    sourceExternalId,
  }));

  const db = await getDb();
  let upsertedCount = 0;

  for (
    let offset = 0;
    offset < rows.length;
    offset += D1_OBSERVATION_WRITE_CHUNK_SIZE
  ) {
    const upserted = await db
      .insert(observationsTable)
      .values(rows.slice(offset, offset + D1_OBSERVATION_WRITE_CHUNK_SIZE))
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

    upsertedCount += upserted.length;
  }

  return upsertedCount;
};

const createSyncRunRecord = async (startedAt: Date) => {
  const db = await getDb();
  const inserted = await db
    .insert(syncRuns)
    .values({
      provider: PROVIDER,
      jobName: JOB_NAME,
      status: "running",
      startedAt,
      meta: {
        provider: PROVIDER,
        jobName: JOB_NAME,
      },
    })
    .returning({ id: syncRuns.id });

  return inserted[0]?.id ?? null;
};

const buildResponse = (params: {
  start: Date;
  finish: Date;
  series: SyncSeriesResult[];
  activeSources: number;
  observationsFetched: number;
  observationsUpserted: number;
  observationsSkipped: number;
}): SyncRunResponse => {
  const successfulSources = params.series.filter((item) => item.status === "success").length;
  const skippedSources = params.series.filter((item) => item.status === "skipped").length;
  const failedSources = params.series.filter((item) => item.status === "failed").length;
  const hasFailures = failedSources > 0;

  return {
    provider: PROVIDER,
    jobName: JOB_NAME,
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
    summary: {
      hasFailures,
      failedSources: params.series
        .filter((item) => item.status === "failed")
        .map((item) => `${item.indicatorSlug}(${item.sourceExternalId})`),
    },
  };
};

export async function POST(request: NextRequest) {
  if (!hasValidCronToken(request)) {
    return unauthorizedResponse();
  }

  const db = await getDb();
  const startedAt = new Date();
  const runId = await createSyncRunRecord(startedAt);

  if (!runId) {
    return NextResponse.json(
      {
        error: "failed to create sync run record",
      },
      { status: 500 },
    );
  }

  const sourceResults: SyncSeriesResult[] = [];
  let fetchedCount = 0;
  let upsertedCount = 0;
  let skippedCount = 0;
  let activeSourceCount = 0;
  let response: SyncRunResponse;
  let httpStatus = 200;
  let runLevelError: SerializedError | null = null;

  try {
    const activeSources = await db
      .select({
        indicatorId: indicatorSources.indicatorId,
        indicatorSlug: indicators.slug,
        indicatorFrequency: indicators.frequency,
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
    activeSourceCount = activeSources.length;

    const latestRows = await db
      .select({
        indicatorId: observationsTable.indicatorId,
        sourceExternalId: observationsTable.sourceExternalId,
        latestObservationDate: sql<Date | string | null>`max(${observationsTable.observationDate})`,
        lastFetchedAt: sql<Date | string | number | null>`max(${observationsTable.fetchedAt})`,
      })
      .from(observationsTable)
      .where(eq(observationsTable.sourceProvider, PROVIDER))
      .groupBy(observationsTable.indicatorId, observationsTable.sourceExternalId);

    const sourceStateBySource = new Map(
      latestRows.map((row) => [
        getSourceKey(row.indicatorId, row.sourceExternalId),
        {
          latestObservationDate: toDateString(row.latestObservationDate),
          lastFetchedAt: toIsoString(row.lastFetchedAt),
        },
      ]),
    );

    for (const source of activeSources) {
      const sourceState =
        sourceStateBySource.get(
          getSourceKey(source.indicatorId, source.sourceExternalId),
        ) ?? {
          latestObservationDate: null,
          lastFetchedAt: null,
        };
      const { latestObservationDate, lastFetchedAt } = sourceState;
      const syncStartDate =
        getSyncStartDate(
          latestObservationDate,
          source.indicatorFrequency,
        ) ?? getInitialBackfillStartDate(startedAt);
      const summary: SyncSeriesResult = {
        indicatorSlug: source.indicatorSlug,
        indicatorId: source.indicatorId,
        indicatorFrequency: source.indicatorFrequency,
        sourceExternalId: source.sourceExternalId,
        sourceUrl: source.sourceUrl,
        status: "success",
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

        const parsed = await fetchCboeDailyPricesCsv({
          externalId: source.sourceExternalId,
          sourceUrl: source.sourceUrl,
          observationStart: syncStartDate,
        });
        const skipped = serializeSkipped(parsed.skipped);
        summary.requestedObservations = parsed.observations.length + parsed.skipped.length;
        summary.skippedObservations = parsed.skipped.length;
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

    if (response.summary.hasFailures) {
      response.status = "partial_failure";
      httpStatus = 500;
    }
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
    httpStatus = 500;
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

  try {
    await db
      .update(syncRuns)
      .set({
        status: runStatus,
        finishedAt: new Date(),
        recordsUpserted: upsertedCount,
        errorMessage: hasFailures
          ? `${JOB_NAME} completed with ${response.summary.failedSources.length} failed source(s)`
          : null,
        meta: {
          provider: PROVIDER,
          jobName: JOB_NAME,
          startedAt: response.startedAt,
          finishedAt: response.finishedAt,
          durationMs: response.durationMs,
          counts: response.counts,
          freshness: response.series.map((item) => ({
            indicatorSlug: item.indicatorSlug,
            sourceExternalId: item.sourceExternalId,
            indicatorFrequency: item.indicatorFrequency,
            status: item.status,
            latestObservationDate: item.latestObservationDate,
            lastFetchedAt: item.lastFetchedAt,
            expectedObservationDate: item.expectedObservationDate,
            syncStartDate: item.syncStartDate,
            freshnessReason: item.freshnessReason,
          })),
          errors: response.series.flatMap((item) =>
            item.errors.map((error) => ({
              sourceExternalId: item.sourceExternalId,
              ...error,
            })),
          ),
          hasFailures,
          sourceCount: response.counts.activeSources,
        },
      })
      .where(eq(syncRuns.id, runId));

    if (upsertedCount > 0) {
      revalidateObservationCaches(response.series);
    }
  } catch (error) {
    const updateError = serializeError(error);
    return NextResponse.json(
      {
        error: "failed to finalize sync run",
        reason: updateError.message,
        runId,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(response, { status: httpStatus });
}
