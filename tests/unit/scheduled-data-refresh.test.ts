import { describe, expect, it, vi } from "vitest";

import { runScheduledDataRefresh } from "../../lib/cloudflare/scheduled-data-refresh";

const silentLogger = {
  log: vi.fn(),
  error: vi.fn(),
};

const responseForPath = (pathname: string): Response => {
  if (pathname.includes("/sync/")) {
    return Response.json({
      status: "success",
      counts: { observationsUpserted: 3 },
    });
  }

  return Response.json({ status: "success" });
};

describe("scheduled data refresh", () => {
  it("runs the complete refresh chain in order", async () => {
    const requests: Request[] = [];
    const selfReference = {
      fetch: vi.fn(async (request: Request) => {
        requests.push(request);
        return responseForPath(new URL(request.url).pathname);
      }),
    };

    const result = await runScheduledDataRefresh({
      selfReference,
      cronSecret: "test-secret",
      cron: "15 6 * * *",
      scheduledTime: Date.parse("2026-08-03T06:15:00.000Z"),
      retryDelayMs: 0,
      sleep: async () => undefined,
      logger: silentLogger,
    });

    expect(requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/api/internal/sync/public-sources",
      "/api/internal/sync/cboe",
      "/api/internal/sync/fred",
      "/api/internal/compute-snapshots",
      "/api/internal/revalidate",
    ]);
    expect(
      requests.every(
        (request) => request.headers.get("authorization") === "Bearer test-secret",
      ),
    ).toBe(true);
    const revalidateRequest = requests.at(-1);
    expect(revalidateRequest).toBeDefined();
    await expect(revalidateRequest?.json()).resolves.toEqual({
      tags: [
        "summary",
        "indicators",
        "observations",
        "data-sources",
        "commentary",
      ],
    });
    expect(result.status).toBe("success");
    expect(result.failedSteps).toEqual([]);
    expect(result.recordsUpserted).toBe(9);
  });

  it("retries transient failures and continues through later steps", async () => {
    const attemptsByPath = new Map<string, number>();
    const selfReference = {
      fetch: vi.fn(async (request: Request) => {
        const pathname = new URL(request.url).pathname;
        const attempts = (attemptsByPath.get(pathname) ?? 0) + 1;
        attemptsByPath.set(pathname, attempts);

        if (pathname.endsWith("/sync/public-sources") && attempts === 1) {
          return Response.json({ error: "temporary upstream error" }, { status: 503 });
        }

        if (pathname.endsWith("/sync/cboe")) {
          return Response.json({ error: "CBOE unavailable" }, { status: 500 });
        }

        return responseForPath(pathname);
      }),
    };

    const result = await runScheduledDataRefresh({
      selfReference,
      cronSecret: "test-secret",
      cron: "15 6 * * *",
      scheduledTime: Date.parse("2026-08-03T06:15:00.000Z"),
      retryDelayMs: 0,
      sleep: async () => undefined,
      logger: silentLogger,
    });

    expect(attemptsByPath.get("/api/internal/sync/public-sources")).toBe(2);
    expect(attemptsByPath.get("/api/internal/sync/cboe")).toBe(2);
    expect(attemptsByPath.get("/api/internal/compute-snapshots")).toBe(1);
    expect(attemptsByPath.get("/api/internal/revalidate")).toBe(1);
    expect(result.status).toBe("partial_failure");
    expect(result.failedSteps).toEqual(["sync-cboe"]);
  });
});
