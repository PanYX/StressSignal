import { describe, expect, it } from "vitest";

import {
  getExpectedObservationDate,
  getSyncStartDate,
  shouldFetchSource,
} from "../../lib/sync/freshness";

describe("sync freshness policy", () => {
  it("schedules an initial sync when no latest observation is known", () => {
    const decision = shouldFetchSource({
      frequency: "daily",
      latestObservationDate: null,
      now: new Date("2026-06-03T12:00:00Z"),
    });

    expect(decision.shouldFetch).toBe(true);
    expect(decision.reason).toBe("no_observations");
    expect(getSyncStartDate(null, "daily")).toBe(null);
  });

  it("does not fetch daily series before the refresh window", () => {
    const latestObservationDate = "2026-06-02";
    const decision = shouldFetchSource({
      frequency: "daily",
      latestObservationDate,
      now: new Date("2026-06-03T12:00:00Z"), // Wed 12:00 UTC, before daily refresh window
    });

    expect(decision.shouldFetch).toBe(false);
    expect(decision.reason).toBe("fresh");
    expect(decision.expectedObservationDate).toBe("2026-06-02");
    expect(getExpectedObservationDate("daily", new Date("2026-06-03T12:00:00Z"))).toBe(
      "2026-06-02",
    );
  });

  it("marks daily source stale after the refresh window", () => {
    const latestObservationDate = "2026-06-02";
    const decision = shouldFetchSource({
      frequency: "daily",
      latestObservationDate,
      now: new Date("2026-06-03T21:00:00Z"), // Wed 21:00 UTC, after daily refresh window
    });

    expect(decision.shouldFetch).toBe(true);
    expect(decision.reason).toBe("stale");
    expect(decision.expectedObservationDate).toBe("2026-06-03");
  });

  it("backs off after a recent stale-source check", () => {
    const decision = shouldFetchSource({
      frequency: "daily",
      latestObservationDate: "2026-06-02",
      lastFetchedAt: new Date("2026-06-03T21:30:00Z"),
      now: new Date("2026-06-03T22:00:00Z"),
    });

    expect(decision.shouldFetch).toBe(false);
    expect(decision.reason).toBe("checked_recently");
    expect(decision.expectedObservationDate).toBe("2026-06-03");
  });

  it("keeps weekly sources fresh across the week and only flags fresh-up-date misses weekly", () => {
    const latestObservationDate = "2026-06-05";

    const mondayDecision = shouldFetchSource({
      frequency: "weekly",
      latestObservationDate,
      now: new Date("2026-06-08T21:00:00Z"), // Monday 21:00 UTC
    });
    expect(mondayDecision.shouldFetch).toBe(false);
    expect(mondayDecision.expectedObservationDate).toBe("2026-06-05");

    const fridayDecision = shouldFetchSource({
      frequency: "weekly",
      latestObservationDate,
      now: new Date("2026-06-12T21:00:00Z"), // Friday 21:00 UTC
    });
    expect(fridayDecision.shouldFetch).toBe(true);
    expect(fridayDecision.expectedObservationDate).toBe("2026-06-12");
  });

  it("returns full-history fetch when no seed exists and overlap window when seeded", () => {
    expect(getSyncStartDate(null, "daily")).toBe(null);
    expect(getSyncStartDate("2026-06-02", "daily")).toBe("2026-05-30");
    expect(getSyncStartDate("2026-06-12", "weekly")).toBe("2026-06-02");
  });

  it("supports provider-specific frequencies through custom policies", () => {
    const customPolicies = {
      biweekly: {
        refreshWindow: { hourUtc: 9 },
        refreshWeekdays: [0],
        lookbackDays: 2,
        retryAfterHours: 6,
      },
    };

    const decision = shouldFetchSource({
      frequency: "biweekly",
      latestObservationDate: "2026-06-01",
      now: new Date("2026-06-07T12:00:00Z"), // Sunday 12:00 UTC
      policies: customPolicies,
    });

    expect(decision.shouldFetch).toBe(true);
    expect(getSyncStartDate("2026-06-01", "biweekly", customPolicies)).toBe(
      "2026-05-30",
    );
  });
});
