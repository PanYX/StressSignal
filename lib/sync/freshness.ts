export type FrequencyPolicyMap = Readonly<Record<string, FrequencyPolicy>>;

export type RefreshWindow = Readonly<{
  hourUtc: number;
  minuteUtc?: number;
}>;

export type FrequencyPolicy = Readonly<{
  refreshWindow: RefreshWindow;
  refreshWeekdays: ReadonlyArray<number>;
  lookbackDays: number;
  retryAfterHours: number;
}>;

export type FreshnessDecisionReason =
  | "no_observations"
  | "stale"
  | "checked_recently"
  | "fresh";

export type FreshnessDecision = Readonly<{
  shouldFetch: boolean;
  reason: FreshnessDecisionReason;
  expectedObservationDate: string;
  policy: FrequencyPolicy;
}>;

type FreshnessInput = Readonly<{
  frequency: string;
  latestObservationDate: string | null;
  lastFetchedAt?: Date | string | null;
  now?: Date;
  policies?: FrequencyPolicyMap;
}>;

const DAILY_REFRESH_WEEKDAYS = [1, 2, 3, 4, 5] as const;

export const DEFAULT_FRESHNESS_POLICIES: FrequencyPolicyMap = {
  daily: {
    refreshWindow: {
      hourUtc: 20,
      minuteUtc: 0,
    },
    refreshWeekdays: DAILY_REFRESH_WEEKDAYS,
    lookbackDays: 3,
    retryAfterHours: 8,
  },
  weekly: {
    refreshWindow: {
      hourUtc: 20,
      minuteUtc: 0,
    },
    refreshWeekdays: [5],
    lookbackDays: 10,
    retryAfterHours: 24,
  },
} as const;

const MAX_POLICY_LOOKUP_DAYS = 14;

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const asUtcDate = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const parseObservationDate = (value: string): Date => {
  const parts = value.split("-");
  if (parts.length !== 3) {
    throw new Error(`Invalid observation date '${value}'. Expected YYYY-MM-DD.`);
  }

  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new Error(`Invalid observation date '${value}'. Expected YYYY-MM-DD.`);
  }

  return new Date(Date.UTC(year, month - 1, day));
};

const parseFetchedAt = (value: Date | string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const getPolicy = (
  frequency: string,
  policies: FrequencyPolicyMap = DEFAULT_FRESHNESS_POLICIES,
): FrequencyPolicy => {
  const policy = policies[frequency];
  if (!policy) {
    throw new Error(`No freshness policy configured for frequency '${frequency}'.`);
  }
  return policy;
};

const getRefreshWindowForDate = (
  date: Date,
  policy: FrequencyPolicy,
): Date => {
  const refresh = new Date(date.getTime());
  refresh.setUTCHours(
    policy.refreshWindow.hourUtc,
    policy.refreshWindow.minuteUtc ?? 0,
    0,
    0,
  );
  return refresh;
};

export const getExpectedObservationDate = (
  frequency: string,
  now: Date = new Date(),
  policies: FrequencyPolicyMap = DEFAULT_FRESHNESS_POLICIES,
): string => {
  const policy = getPolicy(frequency, policies);
  let dateCursor = asUtcDate(now);

  for (let step = 0; step < MAX_POLICY_LOOKUP_DAYS; step += 1) {
    if (policy.refreshWeekdays.includes(dateCursor.getUTCDay())) {
      if (now.getTime() >= getRefreshWindowForDate(dateCursor, policy).getTime()) {
        return toDateKey(dateCursor);
      }
    }

    dateCursor = new Date(dateCursor);
    dateCursor.setUTCDate(dateCursor.getUTCDate() - 1);
  }

  return toDateKey(asUtcDate(now));
};

export const shouldFetchSource = ({
  frequency,
  latestObservationDate,
  lastFetchedAt,
  now = new Date(),
  policies,
}: FreshnessInput): FreshnessDecision => {
  const policy = getPolicy(frequency, policies);
  const expectedObservationDate = getExpectedObservationDate(
    frequency,
    now,
    policies,
  );

  if (latestObservationDate === null) {
    return {
      shouldFetch: true,
      reason: "no_observations",
      expectedObservationDate,
      policy,
    };
  }

  const latestDate = parseObservationDate(latestObservationDate);
  const isStale = latestDate.toISOString().slice(0, 10) < expectedObservationDate;
  const lastFetched = parseFetchedAt(lastFetchedAt);

  if (isStale && lastFetched) {
    const retryAfterMs = policy.retryAfterHours * 60 * 60 * 1000;
    const nextRetryAt = lastFetched.getTime() + retryAfterMs;

    if (now.getTime() < nextRetryAt) {
      return {
        shouldFetch: false,
        reason: "checked_recently",
        expectedObservationDate,
        policy,
      };
    }
  }

  return {
    shouldFetch: isStale,
    reason: isStale ? "stale" : "fresh",
    expectedObservationDate,
    policy,
  };
};

export const getSyncStartDate = (
  latestObservationDate: string | null,
  frequency: string,
  policies: FrequencyPolicyMap = DEFAULT_FRESHNESS_POLICIES,
): string | null => {
  if (latestObservationDate === null) {
    return null;
  }

  const policy = getPolicy(frequency, policies);
  const latest = parseObservationDate(latestObservationDate);
  const startDate = new Date(latest);
  startDate.setUTCDate(latest.getUTCDate() - policy.lookbackDays);

  return toDateKey(startDate);
};
