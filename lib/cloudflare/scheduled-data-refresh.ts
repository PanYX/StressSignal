const INTERNAL_ORIGIN = "https://stresssignal.internal";
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 2_000;

const REVALIDATE_TAGS = [
  "summary",
  "indicators",
  "observations",
  "data-sources",
  "commentary",
] as const;

const SCHEDULED_REFRESH_STEPS = [
  {
    name: "sync-public-sources",
    pathname: "/api/internal/sync/public-sources",
  },
  {
    name: "sync-cboe",
    pathname: "/api/internal/sync/cboe",
  },
  {
    name: "sync-fred",
    pathname: "/api/internal/sync/fred",
  },
  {
    name: "compute-snapshots",
    pathname: "/api/internal/compute-snapshots",
  },
  {
    name: "revalidate",
    pathname: "/api/internal/revalidate",
    body: { tags: REVALIDATE_TAGS },
  },
] as const;

export type ScheduledRefreshStepName =
  (typeof SCHEDULED_REFRESH_STEPS)[number]["name"];

export type ScheduledRefreshStepResult = {
  name: ScheduledRefreshStepName;
  status: "success" | "failed";
  attempts: number;
  httpStatus: number | null;
  durationMs: number;
  recordsUpserted: number | null;
  error: string | null;
};

export type ScheduledDataRefreshResult = {
  cron: string;
  scheduledAt: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  status: "success" | "partial_failure";
  steps: ScheduledRefreshStepResult[];
  failedSteps: ScheduledRefreshStepName[];
  recordsUpserted: number;
};

type ScheduledRefreshLogger = Pick<Console, "log" | "error">;
type Sleep = (delayMs: number) => Promise<void>;

type RunScheduledDataRefreshOptions = {
  selfReference: Pick<Fetcher, "fetch">;
  cronSecret: string;
  cron: string;
  scheduledTime: number;
  internalOrigin?: string;
  maxAttempts?: number;
  retryDelayMs?: number;
  sleep?: Sleep;
  logger?: ScheduledRefreshLogger;
};

type InternalResponseSummary = {
  recordsUpserted: number | null;
  error: string | null;
};

const sleepFor: Sleep = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const serializeError = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown scheduled refresh error";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const summarizeResponse = (body: string): InternalResponseSummary => {
  if (!body.trim()) {
    return { recordsUpserted: null, error: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { recordsUpserted: null, error: "Internal endpoint returned invalid JSON" };
  }

  if (!isRecord(parsed)) {
    return { recordsUpserted: null, error: "Internal endpoint returned an invalid payload" };
  }

  const counts = isRecord(parsed.counts) ? parsed.counts : null;
  const recordsUpserted = counts
    ? asFiniteNumber(counts.observationsUpserted)
    : null;
  const reason = typeof parsed.reason === "string" ? parsed.reason : null;
  const errorCode = typeof parsed.error === "string" ? parsed.error : null;
  const error = reason ?? errorCode;

  return { recordsUpserted, error };
};

const shouldRetryStatus = (status: number): boolean =>
  status === 408 || status === 429 || status >= 500;

const buildStepRequest = (
  origin: string,
  pathname: string,
  cronSecret: string,
  body?: unknown,
): Request => {
  const headers = new Headers({
    accept: "application/json",
    authorization: `Bearer ${cronSecret}`,
  });
  let serializedBody: string | undefined;

  if (body !== undefined) {
    headers.set("content-type", "application/json");
    serializedBody = JSON.stringify(body);
  }

  return new Request(new URL(pathname, origin), {
    method: "POST",
    headers,
    body: serializedBody,
  });
};

const runStep = async ({
  step,
  selfReference,
  cronSecret,
  internalOrigin,
  maxAttempts,
  retryDelayMs,
  sleep,
}: {
  step: (typeof SCHEDULED_REFRESH_STEPS)[number];
  selfReference: Pick<Fetcher, "fetch">;
  cronSecret: string;
  internalOrigin: string;
  maxAttempts: number;
  retryDelayMs: number;
  sleep: Sleep;
}): Promise<ScheduledRefreshStepResult> => {
  const startedAt = Date.now();
  let lastHttpStatus: number | null = null;
  let lastError: string | null = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt;
    try {
      const body = "body" in step ? step.body : undefined;
      const response = await selfReference.fetch(
        buildStepRequest(internalOrigin, step.pathname, cronSecret, body),
      );
      lastHttpStatus = response.status;
      const summary = summarizeResponse(await response.text());

      if (response.ok) {
        return {
          name: step.name,
          status: "success",
          attempts: attempt,
          httpStatus: response.status,
          durationMs: Date.now() - startedAt,
          recordsUpserted: summary.recordsUpserted,
          error: null,
        };
      }

      lastError = summary.error ?? `Internal endpoint returned HTTP ${response.status}`;
      if (!shouldRetryStatus(response.status) || attempt === maxAttempts) {
        break;
      }
    } catch (error) {
      lastError = serializeError(error);
      if (attempt === maxAttempts) {
        break;
      }
    }

    await sleep(retryDelayMs);
  }

  return {
    name: step.name,
    status: "failed",
    attempts,
    httpStatus: lastHttpStatus,
    durationMs: Date.now() - startedAt,
    recordsUpserted: null,
    error: lastError ?? "Scheduled refresh step failed",
  };
};

export const runScheduledDataRefresh = async ({
  selfReference,
  cronSecret,
  cron,
  scheduledTime,
  internalOrigin = INTERNAL_ORIGIN,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  sleep = sleepFor,
  logger = console,
}: RunScheduledDataRefreshOptions): Promise<ScheduledDataRefreshResult> => {
  const normalizedSecret = cronSecret.trim();
  if (!normalizedSecret) {
    throw new Error("CRON_SECRET is required for the scheduled data refresh");
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("maxAttempts must be a positive integer");
  }

  const startedAt = new Date();
  logger.log(
    JSON.stringify({
      event: "scheduled_data_refresh_started",
      cron,
      scheduledAt: new Date(scheduledTime).toISOString(),
      startedAt: startedAt.toISOString(),
    }),
  );

  const steps: ScheduledRefreshStepResult[] = [];
  for (const step of SCHEDULED_REFRESH_STEPS) {
    const result = await runStep({
      step,
      selfReference,
      cronSecret: normalizedSecret,
      internalOrigin,
      maxAttempts,
      retryDelayMs,
      sleep,
    });
    steps.push(result);

    const log = result.status === "success" ? logger.log : logger.error;
    log.call(
      logger,
      JSON.stringify({
        event: "scheduled_data_refresh_step_completed",
        ...result,
      }),
    );
  }

  const finishedAt = new Date();
  const failedSteps = steps
    .filter((step) => step.status === "failed")
    .map((step) => step.name);
  const result: ScheduledDataRefreshResult = {
    cron,
    scheduledAt: new Date(scheduledTime).toISOString(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - startedAt.getTime(),
    status: failedSteps.length > 0 ? "partial_failure" : "success",
    steps,
    failedSteps,
    recordsUpserted: steps.reduce(
      (total, step) => total + (step.recordsUpserted ?? 0),
      0,
    ),
  };

  const log = result.status === "success" ? logger.log : logger.error;
  log.call(
    logger,
    JSON.stringify({
      event: "scheduled_data_refresh_completed",
      cron: result.cron,
      scheduledAt: result.scheduledAt,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      durationMs: result.durationMs,
      status: result.status,
      failedSteps: result.failedSteps,
      recordsUpserted: result.recordsUpserted,
    }),
  );

  return result;
};
