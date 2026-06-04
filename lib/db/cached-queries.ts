import { unstable_cache } from "next/cache";

import {
  getActiveIndicatorBySlug,
  getCompositeRiskScoreHistory,
  getHomepageSummary,
  getIndicatorHistory,
  getIndicatorHistoryBySource,
  getIndicatorSnapshotWithSourcesBySlug,
  getIndicatorSnapshots,
  getIndicatorSnapshotsWithSources,
  type HistoryWindow,
} from "./queries";

export const DATA_CACHE_REVALIDATE_SECONDS = 300;

export const DATA_CACHE_TAGS = {
  summary: "summary",
  indicators: "indicators",
  observations: "observations",
  dataSources: "data-sources",
  commentary: "commentary",
} as const;

type CacheOptions = {
  revalidate: number;
  tags: string[];
};

const databaseConnectionPressureMessages = [
  "Failed to acquire permit to connect to the database",
  "Too many database connection attempts",
] as const;

const collectErrorMessages = (
  error: unknown,
  seen = new Set<unknown>(),
): string[] => {
  if (!error || seen.has(error)) {
    return [];
  }
  seen.add(error);

  if (error instanceof Error) {
    return [
      error.message,
      ...collectErrorMessages(error.cause, seen),
    ];
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message =
      typeof record.message === "string" ? [record.message] : [];
    const cause = collectErrorMessages(record.cause, seen);
    const errors = Array.isArray(record.errors)
      ? record.errors.flatMap((item) => collectErrorMessages(item, seen))
      : [];

    return [...message, ...cause, ...errors];
  }

  return typeof error === "string" ? [error] : [];
};

export const isDatabaseConnectionPressureError = (error: unknown) =>
  collectErrorMessages(error).some((message) =>
    databaseConnectionPressureMessages.some((pattern) =>
      message.includes(pattern),
    ),
  );

const cacheQuery = <Args extends unknown[], Result>(
  task: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: CacheOptions,
) => {
  const cachedTask = unstable_cache(task, keyParts, options);

  return async (...args: Args): Promise<Result> => {
    try {
      return await cachedTask(...args);
    } catch (error) {
      if (isDatabaseConnectionPressureError(error)) {
        throw error;
      }

      return task(...args);
    }
  };
};

const tagsForIndicator = (slug: string) => [
  DATA_CACHE_TAGS.indicators,
  DATA_CACHE_TAGS.observations,
  `indicator:${slug}`,
];

export const getCachedHomepageSummary = cacheQuery(
  async () => getHomepageSummary(),
  ["homepage-summary"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: [
      DATA_CACHE_TAGS.summary,
      DATA_CACHE_TAGS.indicators,
      DATA_CACHE_TAGS.observations,
    ],
  },
);

export const getCachedIndicatorSnapshots = cacheQuery(
  async () => getIndicatorSnapshots(),
  ["indicator-snapshots"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: [
      DATA_CACHE_TAGS.indicators,
      DATA_CACHE_TAGS.summary,
      DATA_CACHE_TAGS.commentary,
    ],
  },
);

export const getCachedIndicatorSnapshotsWithSources = cacheQuery(
  async () => getIndicatorSnapshotsWithSources(),
  ["indicator-snapshots-with-sources"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: [
      DATA_CACHE_TAGS.indicators,
      DATA_CACHE_TAGS.dataSources,
      DATA_CACHE_TAGS.summary,
    ],
  },
);

export const getCachedCompositeRiskScoreHistory = cacheQuery(
  async (window: HistoryWindow = "1Y") => getCompositeRiskScoreHistory(window),
  ["composite-risk-score-history"],
  {
    revalidate: DATA_CACHE_REVALIDATE_SECONDS,
    tags: [
      DATA_CACHE_TAGS.summary,
      DATA_CACHE_TAGS.indicators,
      DATA_CACHE_TAGS.observations,
    ],
  },
);

export const getCachedIndicatorHistory = (
  slug: string,
  window: HistoryWindow = "1Y",
) =>
  cacheQuery(
    async () => getIndicatorHistory(slug, window),
    ["indicator-history", slug, window],
    {
      revalidate: DATA_CACHE_REVALIDATE_SECONDS,
      tags: tagsForIndicator(slug),
    },
  )();

export const getCachedIndicatorHistoryBySource = (
  slug: string,
  sourceExternalId: string,
  window: HistoryWindow = "1Y",
) =>
  cacheQuery(
    async () => getIndicatorHistoryBySource(slug, sourceExternalId, window),
    ["indicator-history-by-source", slug, sourceExternalId, window],
    {
      revalidate: DATA_CACHE_REVALIDATE_SECONDS,
      tags: tagsForIndicator(slug),
    },
  )();

export const getCachedIndicatorSnapshotWithSourcesBySlug = (slug: string) =>
  cacheQuery(
    async () => getIndicatorSnapshotWithSourcesBySlug(slug),
    ["indicator-snapshot-with-sources", slug],
    {
      revalidate: DATA_CACHE_REVALIDATE_SECONDS,
      tags: tagsForIndicator(slug),
    },
  )();

export const getCachedActiveIndicatorBySlug = (slug: string) =>
  cacheQuery(
    async () => getActiveIndicatorBySlug(slug),
    ["active-indicator", slug],
    {
      revalidate: DATA_CACHE_REVALIDATE_SECONDS,
      tags: tagsForIndicator(slug),
    },
  )();
